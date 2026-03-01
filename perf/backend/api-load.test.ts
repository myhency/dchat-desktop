/**
 * REST 엔드포인트 동시 부하 테스트
 *
 * startPerfServer로 in-memory 서버 기동 후 native fetch로 동시 요청.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startPerfServer, type PerfServer } from '../helpers/test-server'
import { computeMetrics, printTable, recordExtra } from '../helpers/metrics'

let server: PerfServer

beforeAll(async () => {
  server = await startPerfServer({
    seedSessions: 1_000,
    messagesPerSession: 10
  })
})

afterAll(async () => {
  await server?.close()
})

async function concurrentFetch(url: string, count: number): Promise<number[]> {
  const samples: number[] = []
  const promises = Array.from({ length: count }, async () => {
    const start = performance.now()
    const res = await fetch(url)
    await res.json()
    const elapsed = Math.round((performance.now() - start) * 100) / 100
    samples.push(elapsed)
  })
  await Promise.all(promises)
  return samples
}

describe('REST API concurrent load', () => {
  it('50 concurrent GET /api/sessions', async () => {
    const samples = await concurrentFetch(`${server.baseUrl}/api/sessions`, 50)
    const m = computeMetrics(samples)
    printTable('GET /api/sessions (50 concurrent)', m)
    expect(m.p95).toBeLessThan(2_000)
  })

  let targetSessionId: string

  it('50 concurrent GET /api/chat/:id/messages', async () => {
    // Get first session ID
    const res = await fetch(`${server.baseUrl}/api/sessions`)
    const sessions = await res.json()
    targetSessionId = sessions[0].id

    const samples = await concurrentFetch(
      `${server.baseUrl}/api/chat/${targetSessionId}/messages`,
      50
    )
    const m = computeMetrics(samples)
    printTable('GET /api/chat/:id/messages (50 concurrent)', m)
    expect(m.p95).toBeLessThan(2_000)
  })

  it('100 concurrent GET /api/settings', async () => {
    const samples = await concurrentFetch(`${server.baseUrl}/api/settings`, 100)
    const m = computeMetrics(samples)
    printTable('GET /api/settings (100 concurrent)', m)
    expect(m.p95).toBeLessThan(500)
  })

  it('throughput: 200 sequential GET /api/sessions', async () => {
    const start = performance.now()
    for (let i = 0; i < 200; i++) {
      const res = await fetch(`${server.baseUrl}/api/sessions`)
      await res.json()
    }
    const totalMs = performance.now() - start
    const reqPerSec = Math.round((200 / totalMs) * 1000 * 100) / 100

    console.log('\n📊 Throughput (200 sequential GET /api/sessions)')
    console.table({
      throughput: {
        'total (ms)': Math.round(totalMs),
        'req/sec': reqPerSec
      }
    })

    recordExtra('Throughput (200 sequential GET /api/sessions)', {
      throughput: { 'total (ms)': Math.round(totalMs), 'req/sec': reqPerSec }
    })

    // Baseline — just ensure reasonable throughput
    expect(reqPerSec).toBeGreaterThan(10)
  })
})
