import type { Message } from '../../entities/message'
import type { StreamChunk } from '../outbound/llm.gateway'

export interface RegenerateMessageUseCase {
  regenerate(
    sessionId: string,
    messageId: string,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message>
}
