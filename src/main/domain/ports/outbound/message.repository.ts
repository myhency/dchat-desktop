import type { Message } from '../../entities/message'

export interface MessageRepository {
  findBySessionId(sessionId: string): Promise<Message[]>
  save(message: Message): Promise<void>
  updateContent(id: string, content: string): Promise<void>
  deleteBySessionId(sessionId: string): Promise<void>
}
