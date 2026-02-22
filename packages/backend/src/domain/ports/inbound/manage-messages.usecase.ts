import type { Message } from '../../entities/message'

export interface ManageMessagesUseCase {
  getMessagesBySession(sessionId: string): Promise<Message[]>
  updateMessageContent(messageId: string, content: string): Promise<void>
}
