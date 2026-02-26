import type { Message } from '../../entities/message'
import type { ModelInfo } from '../../entities/model-info'

export interface StreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
}

export interface ToolUseChunk {
  type: 'tool_use'
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
}

export interface ToolResultChunk {
  type: 'tool_result'
  toolUseId: string
  toolName: string
  content: string
  isError: boolean
}

export interface ToolStartChunk {
  type: 'tool_start'
  toolUseId: string
  toolName: string
}

export type ExtendedStreamChunk = StreamChunk | ToolStartChunk | ToolUseChunk | ToolResultChunk

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ChatOptions {
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  tools?: ToolDefinition[]
}

export type LLMContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string | LLMContentBlock[]
}

export interface LLMStreamResult {
  textContent: string
  toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }>
  stopReason: string
}

export interface LLMGateway {
  streamChat(messages: Message[], options: ChatOptions, signal?: AbortSignal): AsyncIterable<StreamChunk>
  streamChatRaw?(messages: LLMMessage[], options: ChatOptions, signal?: AbortSignal): AsyncGenerator<ExtendedStreamChunk, LLMStreamResult>
  listModels(): ModelInfo[]
}
