import type { Message } from '../../entities/message'
import type { ModelInfo } from '../../entities/model-info'

export interface StreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
}

export interface ChatOptions {
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface LLMGateway {
  streamChat(messages: Message[], options: ChatOptions, signal?: AbortSignal): AsyncIterable<StreamChunk>
  listModels(): ModelInfo[]
}
