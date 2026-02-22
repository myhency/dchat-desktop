import type { Message, ImageAttachment } from '../../entities/message'
import type { StreamChunk } from '../outbound/llm.gateway'

export interface SendMessageUseCase {
  execute(
    sessionId: string,
    content: string,
    attachments: ImageAttachment[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message>
}
