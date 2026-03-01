import type { LLMGateway, StreamChunk, ChatOptions } from '../../packages/backend/src/domain/ports/outbound/llm.gateway'
import type { Message } from '../../packages/backend/src/domain/entities/message'

export interface PerfMockOptions {
  responseTokens?: number
  chunkSize?: number
  delayMs?: number
}

export function createPerfMockGateway(options: PerfMockOptions = {}): LLMGateway {
  const { responseTokens = 100, chunkSize = 4, delayMs = 0 } = options

  // Generate response text
  const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '.split(' ')
  let responseText = ''
  for (let i = 0; responseText.split(' ').length < responseTokens; i++) {
    responseText += words[i % words.length] + ' '
  }
  responseText = responseText.trim()

  return {
    async *streamChat(_messages: Message[], _options: ChatOptions): AsyncIterable<StreamChunk> {
      for (let i = 0; i < responseText.length; i += chunkSize) {
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs))
        }
        yield { type: 'text', content: responseText.slice(i, i + chunkSize) }
      }
      yield { type: 'done', content: '' }
    },
    listModels() {
      return [{ id: 'mock-model', name: 'Mock', provider: 'mock' }]
    }
  }
}
