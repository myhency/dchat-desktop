/**
 * 프론트엔드 렌더링 성능 E2E 테스트
 *
 * vibium 브라우저 자동화로 실제 브라우저에서 렌더링 성능 측정.
 * globalSetup이 dev 서버를 자동 시작/종료.
 *
 * 각 시나리오를 5회 반복 → computeMetrics → printTable (metrics type으로 NDJSON 기록)
 * → 베이스라인 비교 + HTML 레포트 배지 표시 대상
 */

import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'
import crypto from 'crypto'
import { computeMetrics, printTable } from '../helpers/metrics'

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3131'
const REPEAT = 5

// ── Helpers ──

function generateMessages(sessionId: string, count: number, heavy = false) {
  const messages: Array<{
    id: string
    sessionId: string
    role: 'user' | 'assistant'
    content: string
    attachments: never[]
    createdAt: string
  }> = []

  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? 'user' : 'assistant'
    let content: string

    if (heavy && role === 'assistant') {
      content = [
        '# Analysis Result\n',
        '```typescript\nfunction complexAlgorithm(data: number[]): number {\n  return data.reduce((sum, val) => {\n    const factor = Math.sqrt(val) * Math.PI\n    return sum + factor\n  }, 0)\n}\n```\n',
        '| Metric | Value | Unit | Status |\n|--------|-------|------|--------|\n| Latency | 42 | ms | OK |\n| Throughput | 1500 | req/s | OK |\n| Error Rate | 0.01 | % | OK |\n',
        `> Important: This is message ${i} with detailed analysis.\n`,
        'The **performance** characteristics show _significant_ improvement over the baseline.'
      ].join('\n')
    } else {
      content = `Message ${i}: ${role === 'user' ? 'Can you analyze this data?' : 'Here is my analysis of the data you provided.'}`
    }

    messages.push({
      id: crypto.randomUUID(),
      sessionId,
      role,
      content,
      attachments: [],
      createdAt: new Date(Date.now() - (count - i) * 1000).toISOString()
    })
  }

  return messages
}

async function seedSession(title: string, messageCount: number, heavy = false) {
  const sessionId = crypto.randomUUID()
  const now = new Date().toISOString()

  const backupData = {
    version: 1,
    exportedAt: now,
    data: {
      settings: {},
      projects: [],
      sessions: [
        {
          id: sessionId,
          title,
          model: 'claude-haiku-4-5',
          projectId: null,
          isFavorite: false,
          createdAt: now,
          updatedAt: now
        }
      ],
      messages: generateMessages(sessionId, messageCount, heavy)
    }
  }

  const res = await fetch(`${API_URL}/api/backup/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  })

  if (!res.ok) throw new Error(`Seed failed: ${res.status}`)
  return sessionId
}

async function deleteSession(sessionId: string) {
  await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' })
}

/** Navigate and measure time until a user message bubble appears in DOM */
async function measureRenderTime(
  vibe: Awaited<ReturnType<typeof browser.launch>>,
  url: string
): Promise<number> {
  const start = performance.now()
  await vibe.go(url)
  await vibe.find('.bg-primary')
  return Math.round(performance.now() - start)
}

/** Navigate to home to reset state before re-measuring */
async function resetToHome(vibe: Awaited<ReturnType<typeof browser.launch>>): Promise<void> {
  await vibe.go(BASE_URL)
  await vibe.find('button')
}

// ── Tests ──

describe('Frontend render performance', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>
  const sessionIds: string[] = []

  afterAll(async () => {
    for (const id of sessionIds) {
      try { await deleteSession(id) } catch { /* ignore */ }
    }
    await vibe?.quit()
  })

  it('Frontend render (100 messages)', async () => {
    const sessionId = await seedSession('Perf Test 100', 100)
    sessionIds.push(sessionId)

    vibe = await browser.launch({ headless: true })

    // Warmup (cold start — browser launch + first navigation)
    await measureRenderTime(vibe, `${BASE_URL}/chat/${sessionId}`)

    const samples: number[] = []
    for (let i = 0; i < REPEAT; i++) {
      await resetToHome(vibe)
      samples.push(await measureRenderTime(vibe, `${BASE_URL}/chat/${sessionId}`))
    }

    const m = computeMetrics(samples)
    printTable('Frontend render (100 messages)', m)
    expect(m.p95).toBeLessThan(30_000)
  })

  it('Frontend render (500 messages)', async () => {
    const sessionId = await seedSession('Perf Test 500', 500)
    sessionIds.push(sessionId)

    const samples: number[] = []
    for (let i = 0; i < REPEAT; i++) {
      await resetToHome(vibe)
      samples.push(await measureRenderTime(vibe, `${BASE_URL}/chat/${sessionId}`))
    }

    const m = computeMetrics(samples)
    printTable('Frontend render (500 messages)', m)
    expect(m.p95).toBeLessThan(60_000)
  })

  it('Frontend render (50 markdown-heavy)', async () => {
    const sessionId = await seedSession('Perf Test Markdown', 50, true)
    sessionIds.push(sessionId)

    const samples: number[] = []
    for (let i = 0; i < REPEAT; i++) {
      await resetToHome(vibe)
      samples.push(await measureRenderTime(vibe, `${BASE_URL}/chat/${sessionId}`))
    }

    const m = computeMetrics(samples)
    printTable('Frontend render (50 markdown-heavy)', m)
    expect(m.p95).toBeLessThan(30_000)
  })

  it('Frontend render (500 messages, repeated)', async () => {
    const sessionId = sessionIds[1] ?? sessionIds[0]

    const samples: number[] = []
    for (let i = 0; i < REPEAT; i++) {
      await resetToHome(vibe)
      samples.push(await measureRenderTime(vibe, `${BASE_URL}/chat/${sessionId}`))
    }

    const m = computeMetrics(samples)
    printTable('Frontend render (500 messages, repeated)', m)
    expect(m.p95).toBeLessThan(60_000)
  })
})
