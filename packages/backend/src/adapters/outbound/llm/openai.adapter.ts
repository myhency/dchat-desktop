import OpenAI from 'openai'
import type { Message, ImageAttachment } from '../../../domain/entities/message'
import type { ModelInfo } from '../../../domain/entities/model-info'
import type {
  LLMGateway,
  StreamChunk,
  ExtendedStreamChunk,
  ChatOptions,
  LLMMessage,
  LLMStreamResult
} from '../../../domain/ports/outbound/llm.gateway'
import { extractTextFromBuffer } from './document-text-extractor'
import logger from '../../../logger'

const OPENAI_MAX_TOKENS: Record<string, number> = {
  'gpt-4o': 16_384,
  'gpt-4o-mini': 16_384,
  'o3-mini': 100_000,
}

async function mapAttachmentToOpenAIBlock(a: ImageAttachment): Promise<OpenAI.ChatCompletionContentPart> {
  if (a.mimeType.startsWith('image/')) {
    return {
      type: 'image_url' as const,
      image_url: { url: `data:${a.mimeType};base64,${a.base64Data}` }
    }
  }
  const buf = Buffer.from(a.base64Data, 'base64')
  const text = await extractTextFromBuffer(buf, a.mimeType)
  return { type: 'text' as const, text: `[${a.fileName}]\n${text}` }
}

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
        const blocks = await Promise.all(m.attachments.map((a) => mapAttachmentToOpenAIBlock(a)))
        openaiMessages.push({
          role: 'user',
          content: [
            ...blocks,
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
          max_tokens: options.maxTokens ?? OPENAI_MAX_TOKENS[options.model] ?? 4096,
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

  // Text-only fallback — OpenAI tool calling not implemented yet
  async *streamChatRaw(
    messages: LLMMessage[],
    options: ChatOptions,
    signal?: AbortSignal
  ): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt })
    }

    for (const m of messages) {
      if (typeof m.content === 'string' && m.attachments?.length) {
        const blocks = await Promise.all(m.attachments.map((a) => mapAttachmentToOpenAIBlock(a)))
        openaiMessages.push({
          role: m.role as 'user',
          content: [
            ...blocks,
            { type: 'text' as const, text: m.content }
          ]
        })
      } else {
        const text = typeof m.content === 'string'
          ? m.content
          : m.content
              .filter((b) => b.type === 'text')
              .map((b) => (b as { type: 'text'; text: string }).text)
              .join('\n')
        openaiMessages.push({ role: m.role, content: text })
      }
    }

    if (options.tools && options.tools.length > 0) {
      logger.warn({ model: options.model, toolCount: options.tools.length }, 'OpenAI streamChatRaw: tools provided but not supported, ignored')
    }

    logger.debug({ model: options.model, messageCount: messages.length }, 'OpenAI streamChatRaw start (text-only)')

    let textContent = ''

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? OPENAI_MAX_TOKENS[options.model] ?? 4096,
          messages: openaiMessages,
          stream: true,
          ...(options.temperature != null ? { temperature: options.temperature } : {})
        },
        { signal }
      )

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          textContent += delta
          yield { type: 'text', content: delta }
        }
      }

      logger.debug({ model: options.model }, 'OpenAI streamChatRaw done')
    } catch (error) {
      if (signal?.aborted) {
        return { textContent, toolUseBlocks: [], stopReason: 'aborted' }
      }
      logger.error({ err: error, model: options.model }, 'OpenAI streamChatRaw error')
      throw error
    }

    return { textContent, toolUseBlocks: [], stopReason: 'end_turn' }
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
      { id: 'o3-mini', name: 'o3-mini', provider: 'openai' }
    ]
  }
}
