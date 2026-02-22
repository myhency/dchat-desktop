import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '../../../domain/entities/message'
import type { ModelInfo } from '../../../domain/entities/model-info'
import type { LLMGateway, StreamChunk, ChatOptions } from '../../../domain/ports/outbound/llm.gateway'

export class AnthropicAdapter implements LLMGateway {
  private client: Anthropic

  constructor(apiKey: string, baseURL?: string) {
    this.client = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })
  }

  async testConnection(): Promise<void> {
    await this.client.models.list({ limit: 1 })
  }

  async *streamChat(messages: Message[], options: ChatOptions, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.attachments.length > 0
        ? [
            ...m.attachments.map((a) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: a.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: a.base64Data }
            })),
            { type: 'text' as const, text: m.content }
          ]
        : m.content
    }))

    try {
      const stream = this.client.messages.stream(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 4096,
          messages: anthropicMessages,
          ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
          ...(options.temperature != null ? { temperature: options.temperature } : {})
        },
        { signal }
      )

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'text', content: event.delta.text }
        }
      }

      yield { type: 'done', content: '' }
    } catch (error) {
      if (signal?.aborted) return
      throw error
    }
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic' }
    ]
  }
}
