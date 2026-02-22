import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '../../../domain/entities/message'
import type { ModelInfo } from '../../../domain/entities/model-info'
import type {
  LLMGateway,
  StreamChunk,
  ExtendedStreamChunk,
  ChatOptions,
  LLMMessage,
  LLMStreamResult
} from '../../../domain/ports/outbound/llm.gateway'
import logger from '../../../logger'

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

    logger.debug({ model: options.model, messageCount: messages.length }, 'Anthropic stream start')

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

      logger.debug({ model: options.model }, 'Anthropic stream done')
      yield { type: 'done', content: '' }
    } catch (error) {
      if (signal?.aborted) return
      logger.error({ err: error, model: options.model }, 'Anthropic stream error')
      throw error
    }
  }

  async *streamChatRaw(
    messages: LLMMessage[],
    options: ChatOptions,
    signal?: AbortSignal
  ): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult> {
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content }
      }
      // Multi-block content
      return {
        role: m.role,
        content: m.content.map((block) => {
          if (block.type === 'text') {
            return { type: 'text' as const, text: block.text }
          }
          if (block.type === 'tool_use') {
            return { type: 'tool_use' as const, id: block.id, name: block.name, input: block.input }
          }
          // tool_result
          return {
            type: 'tool_result' as const,
            tool_use_id: block.tool_use_id,
            content: block.content,
            ...(block.is_error ? { is_error: true } : {})
          }
        })
      }
    })

    // Build tools param for Anthropic API
    const tools: Anthropic.Tool[] | undefined = options.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema
    }))

    logger.debug({ model: options.model, messageCount: messages.length, toolCount: tools?.length }, 'Anthropic streamChatRaw start')

    let textContent = ''
    const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
    let stopReason = 'end_turn'

    try {
      const stream = this.client.messages.stream(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 4096,
          messages: anthropicMessages,
          ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
          ...(options.temperature != null ? { temperature: options.temperature } : {}),
          ...(tools && tools.length > 0 ? { tools } : {})
        },
        { signal }
      )

      // Track active tool_use blocks
      let activeToolId = ''
      let activeToolName = ''
      let activeToolJson = ''

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            activeToolId = event.content_block.id
            activeToolName = event.content_block.name
            activeToolJson = ''
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            textContent += event.delta.text
            yield { type: 'text', content: event.delta.text }
          } else if (event.delta.type === 'input_json_delta') {
            activeToolJson += event.delta.partial_json
          }
        } else if (event.type === 'content_block_stop') {
          if (activeToolId) {
            let input: Record<string, unknown> = {}
            try {
              input = activeToolJson ? JSON.parse(activeToolJson) : {}
            } catch {
              input = {}
            }
            toolUseBlocks.push({ id: activeToolId, name: activeToolName, input })
            yield {
              type: 'tool_use',
              toolUseId: activeToolId,
              toolName: activeToolName,
              toolInput: input
            }
            activeToolId = ''
            activeToolName = ''
            activeToolJson = ''
          }
        } else if (event.type === 'message_delta') {
          if ('stop_reason' in event.delta && event.delta.stop_reason) {
            stopReason = event.delta.stop_reason
          }
        }
      }

      logger.debug({ model: options.model, stopReason, toolUseCount: toolUseBlocks.length }, 'Anthropic streamChatRaw done')
    } catch (error) {
      if (signal?.aborted) {
        return { textContent, toolUseBlocks, stopReason: 'aborted' }
      }
      logger.error({ err: error, model: options.model }, 'Anthropic streamChatRaw error')
      throw error
    }

    return { textContent, toolUseBlocks, stopReason }
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic' }
    ]
  }
}
