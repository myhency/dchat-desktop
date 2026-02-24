import type { Message } from '../../entities/message'

export interface MessageRepository {
  findBySessionId(sessionId: string): Promise<Message[]>
  searchByKeywords(keywords: string[], excludeSessionId: string, limit: number): Promise<Message[]>
  save(message: Message): Promise<void>
  updateContent(id: string, content: string): Promise<void>
  deleteById(id: string): Promise<void>
  deleteBySessionId(sessionId: string): Promise<void>
  deleteAll(): Promise<void>
}
