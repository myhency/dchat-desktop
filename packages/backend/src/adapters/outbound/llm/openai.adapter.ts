import OpenAI from 'openai'
import type { Message } from '../../../domain/entities/message'
import type { ModelInfo } from '../../../domain/entities/model-info'
import type { LLMGateway, StreamChunk, ChatOptions } from '../../../domain/ports/outbound/llm.gateway'
import logger from '../../../logger'

export class OpenAIAdapter implements LLMGateway {
  private client: OpenAI

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  }

  async testConnection(): Promise<void> {
    await this.client.models.list()
  }

  async *streamChat(messages: Message[], options: ChatOptions, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt })
    }

    for (const m of messages) {
      if (m.role === 'user' && m.attachments.length > 0) {
        openaiMessages.push({
          role: 'user',
          content: [
            ...m.attachments.map((a) => ({
              type: 'image_url' as const,
              image_url: { url: `data:${a.mimeType};base64,${a.base64Data}` }
            })),
            { type: 'text' as const, text: m.content }
          ]
        })
      } else {
        openaiMessages.push({ role: m.role, content: m.content })
      }
    }

    logger.debug({ model: options.model, messageCount: messages.length }, 'OpenAI stream start')

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 4096,
          messages: openaiMessages,
          stream: true,
          ...(options.temperature != null ? { temperature: options.temperature } : {})
        },
        { signal }
      )

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          yield { type: 'text', content: delta }
        }
      }

      logger.debug({ model: options.model }, 'OpenAI stream done')
      yield { type: 'done', content: '' }
    } catch (error) {
      if (signal?.aborted) return
      logger.error({ err: error, model: options.model }, 'OpenAI stream error')
      throw error
    }
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
      { id: 'o3-mini', name: 'o3-mini', provider: 'openai' }
    ]
  }
}
