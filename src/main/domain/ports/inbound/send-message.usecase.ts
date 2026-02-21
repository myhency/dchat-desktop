import type { Message } from '../../entities/message'
import type { StreamChunk } from '../outbound/llm.gateway'

export interface SendMessageUseCase {
  execute(
    sessionId: string,
    content: string,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message>
}
