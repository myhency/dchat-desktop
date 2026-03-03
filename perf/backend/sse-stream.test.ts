/**
 * SSE 스트리밍 동시 부하 테스트
 *
 * mock LLM으로 SSE 스트림 생성 → 파싱 → 완료 시간 측정.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startPerfServer, type PerfServer } from '../helpers/test-server'
import { computeMetrics, printTable, recordExtra } from '../helpers/metrics'

// ── SSE Parser (from api-integration.test.ts) ──

function parseSSE(raw: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = []
  const blocks = raw.split('\n\n').filter(Boolean)
  for (const block of blocks) {
    const lines = block.split('\n')
    let event = ''
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7)
      if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (event && data) {
      try {
        events.push({ event, data: JSON.parse(data) })
      } catch {
        events.push({ event, data })
      }
    }
  }
  return events
}

async function createSessionAndStream(
  baseUrl: string
): Promise<{ sessionId: string; elapsed: number; chunkCount: number }> {
  // Create session
  const sessionRes = await fetch(`${baseUrl}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Perf Test', model: 'mock-model' })
  })
  const session = await sessionRes.json()

  // Stream
  const start = performance.now()
  const res = await fetch(`${baseUrl}/api/chat/${session.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Hello', attachments: [] })
  })
  const raw = await res.text()
  const elapsed = Math.round((performance.now() - start) * 100) / 100

  const events = parseSSE(raw)
  const chunkCount = events.filter((e) => e.event === 'chunk').length

  return { sessionId: session.id, elapsed, chunkCount }
}

describe('SSE streaming performance', () => {
  let server: PerfServer

  beforeAll(async () => {
    server = await startPerfServer({
      seedSessions: 0,
      messagesPerSession: 0,
      mockLlmDelay: 0,
      mockLlmTokens: 500
    })
  })

  afterAll(async () => {
    await server?.close()
  })

  it('single SSE throughput (500 tokens, delay 0ms)', async () => {
    // Warmup: establish connection pool, JIT compile SSE path
    await createSessionAndStream(server.baseUrl)

    const samples: number[] = []
    for (let i = 0; i < 20; i++) {
      const result = await createSessionAndStream(server.baseUrl)
      samples.push(result.elapsed)
    }
    const m = computeMetrics(samples)
    printTable('Single SSE stream (500 tokens)', m)

    // Baseline — should complete quickly with no delay
    expect(m.p95).toBeLessThan(5_000)
  })

  it('5 concurrent SSE streams', async () => {
    // Single baseline
    const single = await createSessionAndStream(server.baseUrl)

    // 5 concurrent
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createSessionAndStream(server.baseUrl))
    )

    const concurrentSamples = results.map((r) => r.elapsed)
    const m = computeMetrics(concurrentSamples)
    printTable('Concurrent SSE (5 streams)', m)

    console.log('\n📊 SSE concurrency comparison')
    console.table({
      single: { 'time (ms)': single.elapsed },
      'concurrent max': { 'time (ms)': m.max },
      ratio: { 'max/single': Math.round((m.max / single.elapsed) * 100) / 100 }
    })

    recordExtra('SSE concurrency comparison', {
      single: { 'time (ms)': single.elapsed },
      'concurrent max': { 'time (ms)': m.max },
      ratio: { 'max/single': Math.round((m.max / single.elapsed) * 100) / 100 }
    })

    // Concurrent max should not be excessively worse than single
    // (with delay=0 and fast mock, absolute times are small so ratio can spike)
    expect(m.max).toBeLessThan(Math.max(single.elapsed * 5, 100))
  })

  it('20 sequential stream create/abort cycles — no memory leak', async () => {
    // Warmup: JIT compile abort path
    await createSessionAndStream(server.baseUrl)

    const before = process.memoryUsage().heapUsed

    const samples: number[] = []
    for (let i = 0; i < 20; i++) {
      const start = performance.now()
      const sessionRes = await fetch(`${server.baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Abort Test ${i}`, model: 'mock-model' })
      })
      const session = await sessionRes.json()

      const controller = new AbortController()
      try {
        const res = await fetch(`${server.baseUrl}/api/chat/${session.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Hello', attachments: [] }),
          signal: controller.signal
        })
        // Abort after getting the response (simulates early close)
        controller.abort()
        try { await res.text() } catch { /* aborted */ }
      } catch {
        // AbortError expected
      }
      samples.push(Math.round((performance.now() - start) * 100) / 100)
    }

    const after = process.memoryUsage().heapUsed
    const leakMb = Math.round((after - before) / 1024 / 1024 * 100) / 100

    const m = computeMetrics(samples)
    printTable('Stream create/abort cycles (20x)', m)

    console.log(`\n📊 Memory delta: ${leakMb} MB`)

    recordExtra('Stream create/abort memory', {
      memory: { 'delta (MB)': leakMb }
    })

    // No significant memory leak (< 50MB over 20 cycles)
    expect(leakMb).toBeLessThan(50)
  })
})
