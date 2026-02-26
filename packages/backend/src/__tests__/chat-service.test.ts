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

  it('도구가 있을 때 system prompt에 tool_usage_guidelines가 포함됨', async () => {
    let capturedOptions: ChatOptions | undefined
    const rawGateway: LLMGateway = {
      async *streamChat() { /* unused */ },
      async *streamChatRaw(_messages: LLMMessage[], options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        capturedOptions = options
        yield { type: 'text', content: 'Hi' }
        return { textContent: 'Hi', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'write_file', description: 'Write a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: '', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    await chatService.execute('s1', 'Hello', [], vi.fn())

    expect(capturedOptions?.systemPrompt).toContain('<tool_usage_guidelines>')
    expect(capturedOptions?.systemPrompt).toContain('명시적으로 요청')
  })

  it('도구가 없을 때 system prompt에 tool_usage_guidelines가 포함되지 않음', async () => {
    let capturedOptions: ChatOptions | undefined
    const gateway: LLMGateway = {
      async *streamChat(_messages: Message[], options: ChatOptions) {
        capturedOptions = options
        yield { type: 'text' as const, content: 'Hi' }
        yield { type: 'done' as const, content: '' }
      },
      listModels: () => []
    }

    llmResolver = { getGateway: () => gateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo)

    await chatService.execute('s1', 'Hello', [], vi.fn())

    // No tools → systemPrompt should be undefined (no project, no custom instructions)
    // or if defined, should not contain tool guidelines
    if (capturedOptions?.systemPrompt) {
      expect(capturedOptions.systemPrompt).not.toContain('<tool_usage_guidelines>')
    }
  })

  it('max_tokens 시 연속 생성: 첫 응답이 잘려도 이어서 생성됨', async () => {
    let callCount = 0
    const rawGateway: LLMGateway = {
      async *streamChat() {},
      async *streamChatRaw(_messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        callCount++
        if (callCount === 1) {
          yield { type: 'text', content: '첫 번째 부분. ' }
          return { textContent: '첫 번째 부분. ', toolUseBlocks: [], stopReason: 'max_tokens' }
        }
        yield { type: 'text', content: '두 번째 부분.' }
        return { textContent: '두 번째 부분.', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'read_file', description: 'Read a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: '', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    expect(result.content).toBe('첫 번째 부분. 두 번째 부분.')
    expect(callCount).toBe(2)
  })

  it('max_tokens가 MAX_TOOL_ITERATIONS번 반복되면 결국 종료됨', async () => {
    let callCount = 0
    const rawGateway: LLMGateway = {
      async *streamChat() {},
      async *streamChatRaw(_messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        callCount++
        yield { type: 'text', content: `part${callCount} ` }
        return { textContent: `part${callCount} `, toolUseBlocks: [], stopReason: 'max_tokens' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'read_file', description: 'Read a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: '', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    // MAX_TOOL_ITERATIONS = 25이므로 25번 호출 후 종료
    expect(callCount).toBe(25)
    // 모든 부분이 누적됨
    expect(result.content).toContain('part1')
    expect(result.content).toContain('part25')
  })

  it('max_tokens + toolUseBlocks > 0 (불완전 도구 호출) 시에도 연속 생성 처리됨', async () => {
    let callCount = 0
    const rawGateway: LLMGateway = {
      async *streamChat() {},
      async *streamChatRaw(_messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        callCount++
        if (callCount === 1) {
          yield { type: 'text', content: '도구를 호출하려고 했는데 ' }
          // max_tokens로 잘렸지만 불완전한 tool_use 블록이 있음
          return {
            textContent: '도구를 호출하려고 했는데 ',
            toolUseBlocks: [{ id: 'tu1', name: 'read_file', input: { path: '/tmp' } }],
            stopReason: 'max_tokens'
          }
        }
        yield { type: 'text', content: '이어서 완료합니다.' }
        return { textContent: '이어서 완료합니다.', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'read_file', description: 'Read a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: 'file contents', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    // 불완전한 도구 호출은 무시되고 연속 생성으로 전환됨
    expect(result.content).toBe('도구를 호출하려고 했는데 이어서 완료합니다.')
    expect(callCount).toBe(2)
    // callTool은 호출되지 않아야 함 (불완전한 도구 호출이므로)
    expect(mcpClient.callTool).not.toHaveBeenCalled()
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

  it('도구 사용 시 segments가 메시지에 포함되어 저장됨', async () => {
    let callCount = 0
    const rawGateway: LLMGateway = {
      async *streamChat() {},
      async *streamChatRaw(_messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        callCount++
        if (callCount === 1) {
          yield { type: 'text', content: '게임을 만들겠습니다. ' }
          yield { type: 'tool_use', toolUseId: 'tu1', toolName: 'write_file', toolInput: { path: '/tmp/game.py', content: 'print("hi")' } }
          return { textContent: '게임을 만들겠습니다. ', toolUseBlocks: [{ id: 'tu1', name: 'write_file', input: { path: '/tmp/game.py', content: 'print("hi")' } }], stopReason: 'tool_use' }
        }
        yield { type: 'text', content: '완성했습니다!' }
        return { textContent: '완성했습니다!', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'write_file', description: 'Write a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: 'File written successfully', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    // segments가 존재해야 함
    expect(result.segments).toBeDefined()
    expect(result.segments).toHaveLength(3) // text, tool, text

    // 첫 번째: text
    expect(result.segments![0]).toEqual({ type: 'text', content: '게임을 만들겠습니다. ' })

    // 두 번째: tool (result 포함)
    expect(result.segments![1]).toEqual({
      type: 'tool',
      toolUseId: 'tu1',
      toolName: 'write_file',
      toolInput: { path: '/tmp/game.py', content: 'print("hi")' },
      result: 'File written successfully',
      isError: false
    })

    // 세 번째: text
    expect(result.segments![2]).toEqual({ type: 'text', content: '완성했습니다!' })

    // DB에 저장된 메시지에도 segments가 포함됨
    const savedAssistant = savedMessages.find((m) => m.role === 'assistant')
    expect(savedAssistant?.segments).toEqual(result.segments)
  })

  it('도구 없는 일반 대화에서는 segments가 undefined', async () => {
    const onChunk = vi.fn()
    const result = await chatService.execute('s1', 'Hello', [], onChunk)

    expect(result.segments).toBeUndefined()

    const savedAssistant = savedMessages.find((m) => m.role === 'assistant')
    expect(savedAssistant?.segments).toBeUndefined()
  })

  it('agentic loop 경로에서 첨부파일이 LLMMessage에 포함됨', async () => {
    let capturedMessages: LLMMessage[] = []
    const rawGateway: LLMGateway = {
      async *streamChat() {},
      async *streamChatRaw(messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        capturedMessages = messages
        yield { type: 'text', content: '요약합니다.' }
        return { textContent: '요약합니다.', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'read_file', description: 'Read a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: '', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    const attachments = [
      { id: 'a1', fileName: 'doc.pdf', mimeType: 'application/pdf', base64Data: 'dGVzdA==' }
    ]

    await chatService.execute('s1', '이거 요약해', attachments, vi.fn())

    // streamChatRaw에 전달된 user 메시지에 attachments가 포함되어야 함
    const userMsg = capturedMessages.find((m) => m.role === 'user' && m.content === '이거 요약해')
    expect(userMsg).toBeDefined()
    expect(userMsg!.attachments).toHaveLength(1)
    expect(userMsg!.attachments![0].fileName).toBe('doc.pdf')
  })

  it('첨부파일 없는 메시지에는 attachments가 설정되지 않음', async () => {
    let capturedMessages: LLMMessage[] = []
    const rawGateway: LLMGateway = {
      async *streamChat() {},
      async *streamChatRaw(messages: LLMMessage[], _options: ChatOptions): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
        capturedMessages = messages
        yield { type: 'text', content: 'Hi' }
        return { textContent: 'Hi', toolUseBlocks: [], stopReason: 'end_turn' }
      },
      listModels: () => []
    }

    const mcpClient: McpClientGateway = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'running' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'read_file', description: 'Read a file', inputSchema: {}, serverId: 'fs' }]),
      callTool: vi.fn(async () => ({ content: '', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    llmResolver = { getGateway: () => rawGateway, listAllModels: () => [], configureProvider: () => {}, testConnection: async () => {} }
    chatService = new ChatService(messageRepo, sessionRepo, llmResolver, settingsRepo, projectRepo, mcpClient)

    await chatService.execute('s1', 'Hello', [], vi.fn())

    const userMsg = capturedMessages.find((m) => m.role === 'user')
    expect(userMsg).toBeDefined()
    expect(userMsg!.attachments).toBeUndefined()
  })
})
