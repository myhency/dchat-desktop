import type Database from 'better-sqlite3'
import type { Skill } from '../../../../domain/entities/skill'
import type { SkillRepository } from '../../../../domain/ports/outbound/skill.repository'

interface SkillRow {
  id: string
  name: string
  description: string
  content: string
  is_enabled: number
  created_at: string
  updated_at: string
}

export class SqliteSkillRepository implements SkillRepository {
  constructor(private readonly db: Database.Database) {}

  async findAll(): Promise<Skill[]> {
    const rows = this.db
      .prepare('SELECT * FROM skills ORDER BY updated_at DESC')
      .all() as SkillRow[]

    return rows.map(this.toDomain)
  }

  async findById(id: string): Promise<Skill | null> {
    const row = this.db
      .prepare('SELECT * FROM skills WHERE id = ?')
      .get(id) as SkillRow | undefined

    return row ? this.toDomain(row) : null
  }

  async findEnabled(): Promise<Skill[]> {
    const rows = this.db
      .prepare('SELECT * FROM skills WHERE is_enabled = 1 ORDER BY created_at ASC')
      .all() as SkillRow[]

    return rows.map(this.toDomain)
  }

  async save(skill: Skill): Promise<void> {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO skills (id, name, description, content, is_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(skill.id, skill.name, skill.description, skill.content, skill.isEnabled ? 1 : 0, skill.createdAt.toISOString(), skill.updatedAt.toISOString())
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM skills WHERE id = ?').run(id)
  }

  async deleteAll(): Promise<void> {
    this.db.prepare('DELETE FROM skills').run()
  }

  private toDomain(row: SkillRow): Skill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      content: row.content,
      isEnabled: row.is_enabled === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
