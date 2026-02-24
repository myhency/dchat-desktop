import type Database from 'better-sqlite3'
import type { Message } from '../../../../domain/entities/message'
import type { MessageRepository } from '../../../../domain/ports/outbound/message.repository'

interface MessageRow {
  id: string
  session_id: string
  role: string
  content: string
  attachments: string
  created_at: string
}

export class SqliteMessageRepository implements MessageRepository {
  constructor(private readonly db: Database.Database) {}

  async findBySessionId(sessionId: string): Promise<Message[]> {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as MessageRow[]

    return rows.map(this.toDomain)
  }

  async searchByKeywords(keywords: string[], excludeSessionId: string, limit: number): Promise<Message[]> {
    if (keywords.length === 0) return []

    const conditions = keywords.map(() => 'content LIKE ?').join(' OR ')
    const params = [
      ...keywords.map((k) => `%${k}%`),
      excludeSessionId,
      limit
    ]

    const rows = this.db
      .prepare(
        `SELECT * FROM messages WHERE (${conditions}) AND session_id != ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(...params) as MessageRow[]

    return rows.map(this.toDomain)
  }

  async save(message: Message): Promise<void> {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO messages (id, session_id, role, content, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(message.id, message.sessionId, message.role, message.content, JSON.stringify(message.attachments), message.createdAt.toISOString())
  }

  async updateContent(id: string, content: string): Promise<void> {
    this.db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id)
  }

  async deleteById(id: string): Promise<void> {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id)
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId)
  }

  async deleteAll(): Promise<void> {
    this.db.prepare('DELETE FROM messages').run()
  }

  private toDomain(row: MessageRow): Message {
    let attachments: Message['attachments'] = []
    try {
      attachments = JSON.parse(row.attachments)
    } catch {
      // fallback for corrupted data
    }
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as Message['role'],
      content: row.content,
      attachments,
      createdAt: new Date(row.created_at)
    }
  }
}
