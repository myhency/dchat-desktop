import type { Message, ImageAttachment } from '../entities/message'
import type { SendMessageUseCase } from '../ports/inbound/send-message.usecase'
import type { RegenerateMessageUseCase } from '../ports/inbound/regenerate-message.usecase'
import type { GenerateTitleUseCase } from '../ports/inbound/generate-title.usecase'
import type { ManageMessagesUseCase } from '../ports/inbound/manage-messages.usecase'
import type { MessageRepository } from '../ports/outbound/message.repository'
import type { SessionRepository } from '../ports/outbound/session.repository'
import type { StreamChunk, ExtendedStreamChunk, ChatOptions, LLMMessage, LLMContentBlock } from '../ports/outbound/llm.gateway'
import type { LLMGatewayResolver } from '../ports/outbound/llm-gateway.resolver'
import type { SettingsRepository } from '../ports/outbound/settings.repository'
import type { ProjectRepository } from '../ports/outbound/project.repository'
import type { McpClientGateway } from '../ports/outbound/mcp-client.gateway'
import { generateId } from './id'

const MAX_TOOL_ITERATIONS = 25

export class ChatService implements SendMessageUseCase, RegenerateMessageUseCase, GenerateTitleUseCase, ManageMessagesUseCase {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly llmResolver: LLMGatewayResolver,
    private readonly settingsRepo: SettingsRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly mcpClient?: McpClientGateway
  ) {}

  async execute(
    sessionId: string,
    content: string,
    attachments: ImageAttachment[],
    onChunk: (chunk: ExtendedStreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message> {
    const session = await this.sessionRepo.findById(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // 사용자 메시지 저장
    const userMessage: Message = {
      id: generateId(),
      sessionId,
      role: 'user',
      content,
      attachments,
      createdAt: new Date()
    }
    await this.messageRepo.save(userMessage)

    // 기존 히스토리 조회
    const history = await this.messageRepo.findBySessionId(sessionId)

    // Check for available MCP tools
    const allTools = this.mcpClient?.getAllTools() ?? []
    const gateway = this.llmResolver.getGateway(session.model)
    const systemPrompt = await this.buildSystemPrompt(session.projectId ?? null)
    const options: ChatOptions = { model: session.model, systemPrompt: systemPrompt || undefined }

    // If tools available and gateway supports raw streaming, use agentic loop
    if (allTools.length > 0 && gateway.streamChatRaw) {
      const toolDefs = allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
      options.tools = toolDefs

      // Build LLMMessage array from history
      const llmMessages: LLMMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content
      }))

      const assistantContent = await this.runAgenticLoop(
        llmMessages,
        options,
        allTools,
        onChunk,
        signal,
        gateway.streamChatRaw.bind(gateway)
      )

      // 어시스턴트 메시지 저장
      const assistantMessage: Message = {
        id: generateId(),
        sessionId,
        role: 'assistant',
        content: assistantContent,
        attachments: [],
        createdAt: new Date()
      }

      if (assistantContent) {
        await this.messageRepo.save(assistantMessage)
      }

      return assistantMessage
    }

    // No tools — use existing streamChat path
    let assistantContent = ''

    try {
      for await (const chunk of gateway.streamChat(history, options, signal)) {
        if (signal?.aborted) break
        onChunk(chunk)
        if (chunk.type === 'text') {
          assistantContent += chunk.content
        }
      }
    } catch (error) {
      if (!signal?.aborted) throw error
    }

    // 어시스턴트 메시지 저장 (빈 내용은 저장 안 함)
    const assistantMessage: Message = {
      id: generateId(),
      sessionId,
      role: 'assistant',
      content: assistantContent,
      attachments: [],
      createdAt: new Date()
    }

    if (assistantContent) {
      await this.messageRepo.save(assistantMessage)
    }

    return assistantMessage
  }

  private async runAgenticLoop(
    messages: LLMMessage[],
    options: ChatOptions,
    allTools: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; serverId: string }>,
    onChunk: (chunk: ExtendedStreamChunk) => void,
    signal: AbortSignal | undefined,
    streamChatRaw: (messages: LLMMessage[], options: ChatOptions, signal?: AbortSignal) => AsyncGenerator<ExtendedStreamChunk, { textContent: string; toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }>; stopReason: string }>
  ): Promise<string> {
    let finalText = ''

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      if (signal?.aborted) break

      const generator = streamChatRaw(messages, options, signal)
      let result: { textContent: string; toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }>; stopReason: string }

      try {
        // Consume chunks from generator
        let next = await generator.next()
        while (!next.done) {
          onChunk(next.value)
          next = await generator.next()
        }
        result = next.value
      } catch (error) {
        if (signal?.aborted) break
        throw error
      }

      finalText += result.textContent

      // If no tool use, we're done
      if (result.stopReason !== 'tool_use' || result.toolUseBlocks.length === 0) {
        onChunk({ type: 'done', content: '' })
        break
      }

      // Build assistant message with text + tool_use blocks
      const assistantBlocks: LLMContentBlock[] = []
      if (result.textContent) {
        assistantBlocks.push({ type: 'text', text: result.textContent })
      }
      for (const toolUse of result.toolUseBlocks) {
        assistantBlocks.push({
          type: 'tool_use',
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input
        })
      }
      messages.push({ role: 'assistant', content: assistantBlocks })

      // Execute tools and build tool_result blocks
      const toolResultBlocks: LLMContentBlock[] = []
      for (const toolUse of result.toolUseBlocks) {
        // Find which server owns this tool
        const toolDef = allTools.find((t) => t.name === toolUse.name)
        if (!toolDef || !this.mcpClient) {
          const errorResult: LLMContentBlock = {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Tool "${toolUse.name}" not found`,
            is_error: true
          }
          toolResultBlocks.push(errorResult)
          onChunk({
            type: 'tool_result',
            toolUseId: toolUse.id,
            toolName: toolUse.name,
            content: `Tool "${toolUse.name}" not found`,
            isError: true
          })
          continue
        }

        const callResult = await this.mcpClient.callTool(toolDef.serverId, toolUse.name, toolUse.input)

        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: callResult.content,
          is_error: callResult.isError
        })

        onChunk({
          type: 'tool_result',
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          content: callResult.content,
          isError: callResult.isError
        })
      }

      messages.push({ role: 'user', content: toolResultBlocks })

      // Reset text for next iteration (only keep final iteration's text)
      finalText = ''
    }

    return finalText
  }

  async regenerate(
    sessionId: string,
    messageId: string,
    onChunk: (chunk: ExtendedStreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message> {
    const session = await this.sessionRepo.findById(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // 전체 메시지 조회 후 대상 메시지 찾기
    const allMessages = await this.messageRepo.findBySessionId(sessionId)
    const targetIndex = allMessages.findIndex((m) => m.id === messageId)
    if (targetIndex === -1) {
      throw new Error(`Message not found: ${messageId}`)
    }

    const target = allMessages[targetIndex]
    // user: 대상 유지, 이후만 삭제 / assistant: 대상 포함 이후 모두 삭제
    const keepCount = target.role === 'user' ? targetIndex + 1 : targetIndex
    const toDelete = allMessages.slice(keepCount)

    for (const msg of toDelete) {
      await this.messageRepo.deleteById(msg.id)
    }

    const history = allMessages.slice(0, keepCount)

    // Check for tools
    const allTools = this.mcpClient?.getAllTools() ?? []
    const gateway = this.llmResolver.getGateway(session.model)
    const systemPrompt = await this.buildSystemPrompt(session.projectId ?? null)
    const options: ChatOptions = { model: session.model, systemPrompt: systemPrompt || undefined }

    let assistantContent = ''

    if (allTools.length > 0 && gateway.streamChatRaw) {
      const toolDefs = allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
      options.tools = toolDefs

      const llmMessages: LLMMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content
      }))

      assistantContent = await this.runAgenticLoop(
        llmMessages,
        options,
        allTools,
        onChunk,
        signal,
        gateway.streamChatRaw.bind(gateway)
      )
    } else {
      try {
        for await (const chunk of gateway.streamChat(history, options, signal)) {
          if (signal?.aborted) break
          onChunk(chunk)
          if (chunk.type === 'text') {
            assistantContent += chunk.content
          }
        }
      } catch (error) {
        if (!signal?.aborted) throw error
      }
    }

    // 새 어시스턴트 메시지 저장
    const assistantMessage: Message = {
      id: generateId(),
      sessionId,
      role: 'assistant',
      content: assistantContent,
      attachments: [],
      createdAt: new Date()
    }

    if (assistantContent) {
      await this.messageRepo.save(assistantMessage)
    }

    return assistantMessage
  }

  async generateTitle(sessionId: string): Promise<string | null> {
    const session = await this.sessionRepo.findById(sessionId)
    if (!session || session.title !== 'New Chat') return null

    const history = await this.messageRepo.findBySessionId(sessionId)
    if (history.length === 0) return null

    const gateway = this.llmResolver.getGateway(session.model)
    const titleMessages: Message[] = [
      {
        id: generateId(),
        sessionId,
        role: 'user',
        content: history
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n'),
        attachments: [],
        createdAt: new Date()
      }
    ]

    const options: ChatOptions = {
      model: session.model,
      maxTokens: 30,
      systemPrompt:
        'Generate a short title (max 6 words) for this conversation. Reply with ONLY the title, no quotes or punctuation.'
    }

    let title = ''
    for await (const chunk of gateway.streamChat(titleMessages, options)) {
      if (chunk.type === 'text') {
        title += chunk.content
      }
    }

    title = title.trim()
    if (!title) return null

    session.title = title
    session.updatedAt = new Date()
    await this.sessionRepo.save(session)

    return title
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return this.messageRepo.findBySessionId(sessionId)
  }

  async updateMessageContent(messageId: string, content: string): Promise<void> {
    await this.messageRepo.updateContent(messageId, content)
  }

  private async buildSystemPrompt(projectId: string | null): Promise<string> {
    const parts: string[] = []

    if (projectId) {
      const project = await this.projectRepo.findById(projectId)
      if (project?.instructions) {
        parts.push(project.instructions)
      }
    }

    const ci = await this.settingsRepo.get('custom_instructions')
    if (ci) {
      parts.push(ci)
    }

    return parts.join('\n\n')
  }
}
