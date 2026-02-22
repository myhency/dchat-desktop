/**
 * L3. HTTP + SSE 통합 테스트
 *
 * Express + in-memory SQLite + mock LLM으로 전체 파이프라인 검증.
 * 실제 HTTP 요청 → Express 라우트 → 서비스 → SSE 응답.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'http'
import BetterSqlite3 from 'better-sqlite3'
import { initSchema } from '../adapters/outbound/persistence/sqlite/schema'
import { SqliteMessageRepository } from '../adapters/outbound/persistence/sqlite/message.repository.impl'
import { SqliteSessionRepository } from '../adapters/outbound/persistence/sqlite/session.repository.impl'
import { SqliteSettingsRepository } from '../adapters/outbound/persistence/sqlite/settings.repository.impl'
import { SqliteProjectRepository } from '../adapters/outbound/persistence/sqlite/project.repository.impl'
import { ChatService } from '../domain/services/chat.service'
import { SessionService } from '../domain/services/session.service'
import { SettingsService } from '../domain/services/settings.service'
import { ProjectService } from '../domain/services/project.service'
import type { LLMGateway, StreamChunk, ChatOptions } from '../domain/ports/outbound/llm.gateway'
import type { Message } from '../domain/entities/message'
import { createApp } from '../server'

// ── Mock LLM ──

function createMockGateway(chunks: StreamChunk[]): LLMGateway {
  return {
    async *streamChat(_messages: Message[], _options: ChatOptions) {
      for (const chunk of chunks) {
        yield chunk
      }
    },
    listModels: () => []
  }
}

// ── Test Setup ──

let server: Server
let baseUrl: string

const defaultChunks: StreamChunk[] = [
  { type: 'text', content: 'Hello' },
  { type: 'text', content: ' World' },
  { type: 'done', content: '' }
]

beforeAll(async () => {
  // In-memory SQLite
  const db = new BetterSqlite3(':memory:')
  initSchema(db)

  // Real repositories on in-memory DB
  const messageRepo = new SqliteMessageRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  const settingsRepo = new SqliteSettingsRepository(db)
  const projectRepo = new SqliteProjectRepository(db)

  // Mock LLM resolver
  const mockGateway = createMockGateway(defaultChunks)
  const llmFactory = {
    getGateway: () => mockGateway,
    listAllModels: () => [],
    configureProvider: () => {},
    testConnection: async () => {}
  }

  // Domain services
  const chatService = new ChatService(messageRepo, sessionRepo, llmFactory, settingsRepo, projectRepo)
  const sessionService = new SessionService(sessionRepo, messageRepo)
  const settingsService = new SettingsService(settingsRepo)
  const projectService = new ProjectService(projectRepo)

  // Build container (duck-typed)
  const container = {
    chatService,
    sessionService,
    settingsService,
    projectService,
    llmFactory,
    async restoreApiKeys() {}
  } as any

  const app = createApp(container)

  // Listen on random port
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`
      }
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
})

// ── Helper ──

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

// ── Tests ──

describe('API Integration', () => {
  it('a. GET /api/health → 200 + {status:"ok"}', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  let sessionId: string

  it('b. POST /api/sessions → 세션 생성', async () => {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', model: 'claude-haiku-4-5' })
    })

    expect(res.status).toBe(200)
    const session = await res.json()
    expect(session.id).toBeDefined()
    expect(session.title).toBe('Test')
    expect(session.model).toBe('claude-haiku-4-5')
    sessionId = session.id
  })

  it('c. POST /api/chat/:sessionId/messages → SSE 스트리밍', async () => {
    const res = await fetch(`${baseUrl}/api/chat/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hi there', attachments: [] })
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')

    const raw = await res.text()
    const events = parseSSE(raw)

    // chunk 이벤트 존재
    const chunkEvents = events.filter((e) => e.event === 'chunk')
    expect(chunkEvents.length).toBeGreaterThan(0)

    // end 이벤트 존재
    const endEvents = events.filter((e) => e.event === 'end')
    expect(endEvents.length).toBe(1)

    // end event의 data에 assistant 메시지 정보 포함
    const endData = endEvents[0].data as any
    expect(endData.role).toBe('assistant')
    expect(endData.content).toBe('Hello World')
  })

  it('d. GET /api/chat/:sessionId/messages → 저장된 메시지 조회', async () => {
    const res = await fetch(`${baseUrl}/api/chat/${sessionId}/messages`)

    expect(res.status).toBe(200)
    const messages = await res.json()

    // user + assistant 2개
    expect(messages.length).toBe(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Hi there')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('Hello World')
  })

  it('e. SSE 이벤트 순서 검증', async () => {
    // 새 세션 생성
    const sessionRes = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Order Test', model: 'claude-haiku-4-5' })
    })
    const session = await sessionRes.json()

    const res = await fetch(`${baseUrl}/api/chat/${session.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test order', attachments: [] })
    })

    const raw = await res.text()
    const events = parseSSE(raw)

    // 마지막 이벤트가 end
    const lastEvent = events.at(-1)
    expect(lastEvent?.event).toBe('end')

    // chunk 이벤트들이 end보다 앞에 위치
    const endIndex = events.findIndex((e) => e.event === 'end')
    const chunkEvents = events.filter((e) => e.event === 'chunk')
    for (const chunk of chunkEvents) {
      const chunkIndex = events.indexOf(chunk)
      expect(chunkIndex).toBeLessThan(endIndex)
    }

    // 각 event/data 쌍이 올바르게 구성됨
    for (const event of events) {
      expect(event.event).toBeTruthy()
      expect(event.data).toBeDefined()
    }
  })
})
