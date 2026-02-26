/**
 * 세션 스코프 도구 권한 테스트
 *
 * "항상 허용" 클릭 시 DB가 아닌 세션 메모리에 저장되는지,
 * 다른 세션에서는 다시 확인 요청이 뜨는지 검증.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../logger', () => {
  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => loggerMock)
  }
  return { default: loggerMock }
})

import express from 'express'
import type { Server } from 'http'
import { createChatRoutes, sessionToolPermissions } from '../adapters/inbound/http/chat.routes'
import type { CompositeMcpClientGateway } from '../adapters/outbound/builtin-tools/composite-mcp-gateway'
import type { SendMessageUseCase } from '../domain/ports/inbound/send-message.usecase'
import type { RegenerateMessageUseCase } from '../domain/ports/inbound/regenerate-message.usecase'
import type { GenerateTitleUseCase } from '../domain/ports/inbound/generate-title.usecase'
import type { ManageMessagesUseCase } from '../domain/ports/inbound/manage-messages.usecase'
import type { ManageSettingsUseCase } from '../domain/ports/inbound/manage-settings.usecase'

// ── Helpers ──

type ConfirmationHandler = (toolUseId: string, toolName: string, toolInput: Record<string, unknown>) => Promise<boolean>

function createMockDeps() {
  let capturedHandler: ConfirmationHandler | null = null

  const mcpGateway = {
    setConfirmationHandler: vi.fn((fn: ConfirmationHandler) => { capturedHandler = fn }),
    clearConfirmationHandler: vi.fn(() => { capturedHandler = null })
  } as unknown as CompositeMcpClientGateway

  const sendMessage = {
    execute: vi.fn(async (_sid: string, _content: string, _att: any[], onChunk: (chunk: any) => void, _signal: AbortSignal) => {
      onChunk({ type: 'text', content: 'ok' })
      onChunk({ type: 'done', content: '' })
      return { id: 'msg-1', role: 'assistant', content: 'ok' }
    })
  } as unknown as SendMessageUseCase

  const regenerateMessage = {
    regenerate: vi.fn()
  } as unknown as RegenerateMessageUseCase

  const generateTitle = {
    generateTitle: vi.fn(async () => null)
  } as unknown as GenerateTitleUseCase

  const manageMessages = {
    getMessagesBySession: vi.fn(async () => []),
    updateMessageContent: vi.fn()
  } as unknown as ManageMessagesUseCase

  const settingsService = {
    get: vi.fn(async () => null),
    set: vi.fn()
  } as unknown as ManageSettingsUseCase

  return { mcpGateway, sendMessage, regenerateMessage, generateTitle, manageMessages, settingsService, getCapturedHandler: () => capturedHandler }
}

function createTestApp(deps: ReturnType<typeof createMockDeps>) {
  const app = express()
  app.use(express.json())
  app.use('/api/chat', createChatRoutes(
    deps.sendMessage,
    deps.regenerateMessage,
    deps.generateTitle,
    deps.manageMessages,
    deps.mcpGateway,
    deps.settingsService
  ))
  return app
}

async function listenOnRandomPort(app: express.Express): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number }
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` })
    })
  })
}

// ── Tests ──

describe('Session-scoped tool permissions', () => {
  beforeEach(() => {
    sessionToolPermissions.clear()
  })

  it('sessionToolPermissions Map stores per-session tool sets', () => {
    expect(sessionToolPermissions.has('session-A')).toBe(false)

    sessionToolPermissions.set('session-A', new Set(['execute_command']))

    expect(sessionToolPermissions.get('session-A')?.has('execute_command')).toBe(true)
    expect(sessionToolPermissions.get('session-B')?.has('execute_command')).toBeFalsy()
  })

  it('session-scoped permissions are isolated between sessions', () => {
    sessionToolPermissions.set('session-A', new Set(['execute_command', 'write_file']))
    sessionToolPermissions.set('session-B', new Set(['read_file']))

    expect(sessionToolPermissions.get('session-A')?.has('execute_command')).toBe(true)
    expect(sessionToolPermissions.get('session-A')?.has('write_file')).toBe(true)
    expect(sessionToolPermissions.get('session-A')?.has('read_file')).toBe(false)

    expect(sessionToolPermissions.get('session-B')?.has('read_file')).toBe(true)
    expect(sessionToolPermissions.get('session-B')?.has('execute_command')).toBeFalsy()

    expect(sessionToolPermissions.get('session-C')).toBeUndefined()
  })

  it('confirmation handler auto-approves when session has tool permission', async () => {
    const deps = createMockDeps()

    // Pre-set session permission
    sessionToolPermissions.set('session-A', new Set(['execute_command']))

    let confirmResult: boolean | null = null

    deps.sendMessage.execute = vi.fn(async (_sid, _content, _att, onChunk, _signal) => {
      const handler = deps.getCapturedHandler()
      if (handler) {
        confirmResult = await handler('tool-use-1', 'execute_command', { command: 'ls' })
      }
      onChunk({ type: 'text', content: 'ok' })
      onChunk({ type: 'done', content: '' })
      return { id: 'msg-1', role: 'assistant', content: 'ok' }
    }) as any

    const app = createTestApp(deps)
    const { server, baseUrl } = await listenOnRandomPort(app)

    try {
      const res = await fetch(`${baseUrl}/api/chat/session-A/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test', attachments: [] })
      })
      await res.text()

      expect(confirmResult).toBe(true)
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })

  it('confirmation handler does NOT auto-approve for different session', async () => {
    const deps = createMockDeps()

    // Permission set for session-A only
    sessionToolPermissions.set('session-A', new Set(['execute_command']))

    let handlerReturnedImmediately = false

    deps.sendMessage.execute = vi.fn(async (_sid, _content, _att, onChunk, _signal) => {
      const handler = deps.getCapturedHandler()
      if (handler) {
        // Session-B has no permissions — handler should NOT resolve immediately
        const result = handler('tool-use-2', 'execute_command', { command: 'ls' })
        // Check if the Promise resolved synchronously (it shouldn't for non-permitted session)
        let resolved = false
        result.then(() => { resolved = true })
        // Give a microtask to see if it resolved
        await new Promise(r => setTimeout(r, 0))
        handlerReturnedImmediately = resolved
        // Don't await — it will be cleaned up on stream close
      }
      onChunk({ type: 'text', content: 'ok' })
      onChunk({ type: 'done', content: '' })
      return { id: 'msg-1', role: 'assistant', content: 'ok' }
    }) as any

    const app = createTestApp(deps)
    const { server, baseUrl } = await listenOnRandomPort(app)

    try {
      const res = await fetch(`${baseUrl}/api/chat/session-B/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test', attachments: [] })
      })
      await res.text()

      // Handler should NOT have resolved immediately (it's waiting for user confirmation)
      expect(handlerReturnedImmediately).toBe(false)
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })

  it('tool-confirm endpoint with alwaysAllow adds to sessionToolPermissions', async () => {
    const deps = createMockDeps()

    // Make sendMessage.execute await the confirmation — this keeps the stream open
    deps.sendMessage.execute = vi.fn(async (_sid, _content, _att, onChunk, _signal) => {
      const handler = deps.getCapturedHandler()
      if (handler) {
        await handler('tool-use-abc', 'write_file', { path: '/tmp/test' })
      }
      onChunk({ type: 'text', content: 'ok' })
      onChunk({ type: 'done', content: '' })
      return { id: 'msg-1', role: 'assistant', content: 'ok' }
    }) as any

    const app = createTestApp(deps)
    const { server, baseUrl } = await listenOnRandomPort(app)

    try {
      // Start stream (keeps open because execute awaits the confirmation handler)
      const streamPromise = fetch(`${baseUrl}/api/chat/session-X/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test', attachments: [] })
      })

      // Wait for the pending confirmation to be registered
      await new Promise(r => setTimeout(r, 50))

      // Call tool-confirm with alwaysAllow=true
      const confirmRes = await fetch(`${baseUrl}/api/chat/session-X/tool-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolUseId: 'tool-use-abc', approved: true, alwaysAllow: true })
      })
      const confirmBody = await confirmRes.json()
      expect(confirmBody).toEqual({ ok: true })

      // Wait for stream to finish
      const streamRes = await streamPromise
      await streamRes.text()

      // Verify: permission stored in session memory
      expect(sessionToolPermissions.get('session-X')?.has('write_file')).toBe(true)

      // Verify: DB settingsService.set was NOT called
      expect(deps.settingsService.set).not.toHaveBeenCalled()
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })

  it('tool-confirm without alwaysAllow does NOT add to sessionToolPermissions', async () => {
    const deps = createMockDeps()

    deps.sendMessage.execute = vi.fn(async (_sid, _content, _att, onChunk, _signal) => {
      const handler = deps.getCapturedHandler()
      if (handler) {
        await handler('tool-use-xyz', 'read_file', { path: '/tmp/test' })
      }
      onChunk({ type: 'text', content: 'ok' })
      onChunk({ type: 'done', content: '' })
      return { id: 'msg-1', role: 'assistant', content: 'ok' }
    }) as any

    const app = createTestApp(deps)
    const { server, baseUrl } = await listenOnRandomPort(app)

    try {
      const streamPromise = fetch(`${baseUrl}/api/chat/session-Y/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test', attachments: [] })
      })

      await new Promise(r => setTimeout(r, 50))

      // Approve without alwaysAllow
      await fetch(`${baseUrl}/api/chat/session-Y/tool-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolUseId: 'tool-use-xyz', approved: true })
      })

      const streamRes = await streamPromise
      await streamRes.text()

      // Should NOT have stored any permission
      expect(sessionToolPermissions.has('session-Y')).toBe(false)
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })
})
