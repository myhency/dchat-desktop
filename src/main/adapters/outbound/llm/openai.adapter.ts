import OpenAI from 'openai'
import type { Message } from '../../../domain/entities/message'
import type { ModelInfo } from '../../../domain/entities/model-info'
import type { LLMGateway, StreamChunk, ChatOptions } from '../../../domain/ports/outbound/llm.gateway'

export class OpenAIAdapter implements LLMGateway {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async *streamChat(messages: Message[], options: ChatOptions, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt })
    }

    for (const m of messages) {
      openaiMessages.push({ role: m.role, content: m.content })
    }

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

      yield { type: 'done', content: '' }
    } catch (error) {
      if (signal?.aborted) return
      const message = error instanceof Error ? error.message : 'Unknown error'
      yield { type: 'error', content: message }
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
