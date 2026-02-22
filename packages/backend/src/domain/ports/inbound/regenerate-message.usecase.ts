import type { Message } from '../../entities/message'
import type { ExtendedStreamChunk } from '../outbound/llm.gateway'

export interface RegenerateMessageUseCase {
  regenerate(
    sessionId: string,
    messageId: string,
    onChunk: (chunk: ExtendedStreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message>
}
