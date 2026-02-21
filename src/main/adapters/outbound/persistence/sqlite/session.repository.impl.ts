import type Database from 'better-sqlite3'
import type { Session } from '../../../../domain/entities/session'
import type { SessionRepository } from '../../../../domain/ports/outbound/session.repository'

interface SessionRow {
  id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: Database.Database) {}

  async findAll(): Promise<Session[]> {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY updated_at DESC')
      .all() as SessionRow[]

    return rows.map(this.toDomain)
  }

  async findById(id: string): Promise<Session | null> {
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined

    return row ? this.toDomain(row) : null
  }

  async save(session: Session): Promise<void> {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO sessions (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(session.id, session.title, session.model, session.createdAt.toISOString(), session.updatedAt.toISOString())
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  }

  private toDomain(row: SessionRow): Session {
    return {
      id: row.id,
      title: row.title,
      model: row.model,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
