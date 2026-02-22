import type { Message, ImageAttachment } from '../../entities/message'
import type { ExtendedStreamChunk } from '../outbound/llm.gateway'

export interface SendMessageUseCase {
  execute(
    sessionId: string,
    content: string,
    attachments: ImageAttachment[],
    onChunk: (chunk: ExtendedStreamChunk) => void,
    signal?: AbortSignal
  ): Promise<Message>
}
