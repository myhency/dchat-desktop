import type { Message, ImageAttachment } from '../entities/message'
import type { SendMessageUseCase } from '../ports/inbound/send-message.usecase'
import type { RegenerateMessageUseCase } from '../ports/inbound/regenerate-message.usecase'
import type { GenerateTitleUseCase } from '../ports/inbound/generate-title.usecase'
import type { MessageRepository } from '../ports/outbound/message.repository'
import type { SessionRepository } from '../ports/outbound/session.repository'
import type { StreamChunk, ChatOptions } from '../ports/outbound/llm.gateway'
import type { LLMGatewayResolver } from '../ports/outbound/llm-gateway.resolver'
import type { SettingsRepository } from '../ports/outbound/settings.repository'
import type { ProjectRepository } from '../ports/outbound/project.repository'
import { generateId } from './id'

export class ChatService implements SendMessageUseCase, RegenerateMessageUseCase, GenerateTitleUseCase {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly llmResolver: LLMGatewayResolver,
    private readonly settingsRepo: SettingsRepository,
    private readonly projectRepo: ProjectRepository
  ) {}

  async execute(
    sessionId: string,
    content: string,
    attachments: ImageAttachment[],
    onChunk: (chunk: StreamChunk) => void,
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

    // LLM 스트리밍 호출
    const gateway = this.llmResolver.getGateway(session.model)
    const systemPrompt = await this.buildSystemPrompt(session.projectId ?? null)
    const options: ChatOptions = { model: session.model, systemPrompt: systemPrompt || undefined }
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

  async regenerate(
    sessionId: string,
    messageId: string,
    onChunk: (chunk: StreamChunk) => void,
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

    // LLM 스트리밍 호출
    const gateway = this.llmResolver.getGateway(session.model)
    const systemPrompt = await this.buildSystemPrompt(session.projectId ?? null)
    const options: ChatOptions = { model: session.model, systemPrompt: systemPrompt || undefined }
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
