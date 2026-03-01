/**
 * DB 쿼리 성능 테스트
 *
 * HTTP 없이 SQLite 직접 접근. in-memory DB에 대량 데이터 시딩 후
 * Repository 메서드 응답 시간 측정.
 */

import { describe, it, expect } from 'vitest'
import { SqliteSessionRepository } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/session.repository.impl'
import { SqliteMessageRepository } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/message.repository.impl'
import { createSeededDb } from '../helpers/seed'
import { computeMetrics, printTable, recordExtra } from '../helpers/metrics'

const WARMUP = 3
const ITERATIONS = 50

async function benchmark(fn: () => Promise<unknown>): Promise<number[]> {
  // Warmup: populate SQLite page cache, trigger V8 JIT
  for (let i = 0; i < WARMUP; i++) await fn()

  const samples: number[] = []
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now()
    await fn()
    samples.push(Math.round((performance.now() - start) * 100) / 100)
  }
  return samples
}

describe('Session findAll scaling', () => {
  const scales = [100, 500, 1_000, 5_000]

  for (const count of scales) {
    it(`findAll with ${count} sessions`, async () => {
      const { db } = createSeededDb({ sessionCount: count, messagesPerSession: 1 })
      const repo = new SqliteSessionRepository(db)

      const samples = await benchmark(() => repo.findAll())
      const m = computeMetrics(samples)
      printTable(`Session findAll (${count})`, m)

      if (count === 1_000) {
        expect(m.p95).toBeLessThan(100)
      }

      db.close()
    })
  }
})

describe('Message findBySessionId scaling', () => {
  const scales = [100, 500, 1_000, 5_000]

  for (const messageCount of scales) {
    it(`findBySessionId with ${messageCount} messages`, async () => {
      const { db, firstSessionId } = createSeededDb({
        sessionCount: 1,
        messagesPerSession: messageCount
      })
      const repo = new SqliteMessageRepository(db)

      const samples = await benchmark(() => repo.findBySessionId(firstSessionId))
      const m = computeMetrics(samples)
      printTable(`Message findBySessionId (${messageCount})`, m)

      if (messageCount === 1_000) {
        expect(m.p95).toBeLessThan(50)
      }

      db.close()
    })
  }
})

describe('Keyword search (LIKE)', () => {
  it('searchByKeywords across 20K messages', async () => {
    const { db, firstSessionId } = createSeededDb({
      sessionCount: 1_000,
      messagesPerSession: 20
    })
    const repo = new SqliteMessageRepository(db)
    const keywords = ['lorem', 'fibonacci', 'Heading']

    const samples = await benchmark(() => repo.searchByKeywords(keywords, firstSessionId, 50))
    const m = computeMetrics(samples)
    printTable('Keyword search (20K messages, 3 keywords)', m)

    // Baseline measurement — just ensure it completes
    expect(m.p95).toBeLessThan(5_000)

    db.close()
  })
})

describe('Concurrent reads (Promise.all)', () => {
  it('50 concurrent findBySessionId', async () => {
    const { db, sessionIds } = createSeededDb({
      sessionCount: 50,
      messagesPerSession: 100
    })
    const repo = new SqliteMessageRepository(db)

    // Sequential baseline
    const seqStart = performance.now()
    for (const id of sessionIds) {
      await repo.findBySessionId(id)
    }
    const seqTime = performance.now() - seqStart

    // Concurrent
    const concStart = performance.now()
    await Promise.all(sessionIds.map((id) => repo.findBySessionId(id)))
    const concTime = performance.now() - concStart

    const ratio = Math.round((concTime / seqTime) * 100) / 100

    console.log('\n📊 Concurrent reads (50 sessions × 100 messages)')
    console.table({
      sequential: { 'time (ms)': Math.round(seqTime * 100) / 100 },
      concurrent: { 'time (ms)': Math.round(concTime * 100) / 100 },
      ratio: { 'concurrent/sequential': ratio }
    })
    recordExtra('Concurrent reads (50 sessions × 100 messages)', {
      sequential: { 'time (ms)': Math.round(seqTime * 100) / 100 },
      concurrent: { 'time (ms)': Math.round(concTime * 100) / 100 },
      ratio: { 'concurrent/sequential': ratio }
    })

    // Concurrent should not be dramatically worse than sequential
    // (SQLite is single-writer but reads are serialized, so ratio ~ 1.0)
    expect(ratio).toBeLessThan(3)

    db.close()
  })
})
