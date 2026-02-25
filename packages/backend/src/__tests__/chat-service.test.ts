/**
 * L2. ChatService 단위 테스트 — mock ports
 *
 * 도메인 서비스가 포트 인터페이스를 올바르게 오케스트레이션하는지 검증.
 * 외부 의존성 ZERO.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatService } from '../domain/services/chat.service'
import type { Message } from '../domain/entities/message'
import type { Session } from '../domain/entities/session'
import type { MessageRepository } from '../domain/ports/outbound/message.repository'
import type { SessionRepository } from '../domain/ports/outbound/session.repository'
import type { SettingsRepository } from '../domain/ports/outbound/settings.repository'
import type { ProjectRepository } from '../domain/ports/outbound/project.repository'
import type { LLMGatewayResolver } from '../domain/ports/outbound/llm-gateway.resolver'
import type { LLMGateway, StreamChunk, ChatOptions, ExtendedStreamChunk, LLMStreamResult, LLMMessage } from '../domain/ports/outbound/llm.gateway'
import type { McpClientGateway } from '../domain/ports/outbound/mcp-client.gateway'

// ── Helpers ──

function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 's1',
    title: 'New Chat',
    model: 'claude-haiku-4-5',
    projectId: null,
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

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

// ── Tests ──

describe('ChatService', () => {
  let messageRepo: MessageRepository
  let sessionRepo: SessionRepository
  let settingsRepo: SettingsRepository
  let projectRepo: ProjectRepository
  let llmResolver: LLMGatewayResolver
  let mockGateway: LLMGateway
  let chatService: ChatService

  // 저장된 메시지를 추적
  let savedMessages: Message[]

  beforeEach(() => {
    savedMessages = []

    messageRepo = {
      findBySessionId: vi.fn(async () => savedMessages),
      searchByKeywords: vi.fn(async () => []),
      save: vi.fn(async (msg: Message) => { savedMessages.push(msg) }),
      updateContent: vi.fn(async () => {}),
      deleteById: vi.fn(async () => {}),
      deleteBySessionId: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    sessionRepo = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => createMockSession()),
      findByProjectId: vi.fn(async () => []),
      save: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    settingsRepo = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => ({})),
      deleteAll: vi.fn(async () => {})
    }

    projectRepo = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    mockGateway = createMockGateway([
      { type: 'text', content: 'Hi' },
      { type: 'done', content: '' }
    ])

    llmResolver = {
      getGateway: () => mockGateway,
      listAllModels: () => [],
      configureProvider: () => {},
      testConnection: async () => {}
    }

    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo)
  })

  it('정상 흐름: user 메시지 저장 → LLM 스트리밍 → assistant 메시지 저장', async () => {
    const onChunk = vi.fn()

    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    // user 메시지 save
    expect(messageRepo.save).toHaveBeenCalledTimes(2) // user + assistant
    const userMsg = (messageRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as Message
    expect(userMsg.role).toBe('user')
    expect(userMsg.content).toBe('Hello')

    // assistant 메시지 save
    const assistantMsg = (messageRepo.save as ReturnType<typeof vi.fn>).mock.calls[1][0] as Message
    expect(assistantMsg.role).toBe('assistant')
    expect(assistantMsg.content).toBe('Hi')

    // 반환값
    expect(result.role).toBe('assistant')
    expect(result.content).toBe('Hi')

    // history 조회
    expect(messageRepo.findBySessionId).toHaveBeenCalledWith('s1')
  })

  it('onChunk 콜백이 각 chunk마다 호출됨', async () => {
    const onChunk = vi.fn()

    await chatService.execute('s1', 'Hello', [], onChunk)

    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledWith({ type: 'text', content: 'Hi' })
    expect(onChunk).toHaveBeenCalledWith({ type: 'done', content: '' })
  })

  it('빈 응답: LLM이 done만 반환하면 assistant 메시지 저장 안 함', async () => {
    mockGateway = createMockGateway([{ type: 'done', content: '' }])
    llmResolver = { getGateway: () => mockGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo)

    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    // user 메시지만 save (1회)
    expect(messageRepo.save).toHaveBeenCalledTimes(1)
    expect(result.content).toBe('')
  })

  it('세션 미존재 시 Error throw', async () => {
    sessionRepo.findById = vi.fn(async () => null)
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo)

    await expect(chatService.execute('nonexistent', 'Hello', [], vi.fn()))
      .rejects.toThrow('Session not found: nonexistent')
  })

  it('MCP tool use: 모든 iteration의 텍스트가 누적되어 저장됨', async () => {
    // streamChatRaw: 1회차 → text + tool_use, 2회차 → text + end
    let callCount = 0
    const rawGateway: LLMGateway = {
      async *streamChat() { /* unused */ },
      async *streamChatRaw(_messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        callCount++
        if (callCount === 1) {
          yield { type: 'text', content: '파일을 읽어볼게요. ' }
          yield { type: 'tool_use', toolUseId: 'tu1', toolName: 'read_file', toolInput: { path: '/tmp/test' } }
          return { textContent: '파일을 읽어볼게요. ', toolUseBlocks: [{ id: 'tu1', name: 'read_file', input: { path: '/tmp/test' } }], stopReason: 'tool_use' }
        }
        yield { type: 'text', content: '결과는 이렇습니다.' }
        return { textContent: '결과는 이렇습니다.', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'read_file', description: 'Read a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: 'file contents here', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    // assistant 메시지가 모든 iteration의 텍스트를 포함해야 함
    expect(result.content).toBe('파일을 읽어볼게요. 결과는 이렇습니다.')

    // DB에 저장된 assistant 메시지도 동일
    const savedAssistant = savedMessages.find((m) => m.role === 'assistant')
    expect(savedAssistant?.content).toBe('파일을 읽어볼게요. 결과는 이렇습니다.')
  })
})
