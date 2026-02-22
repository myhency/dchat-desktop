import type Database from 'better-sqlite3'
import type { Project } from '../../../../domain/entities/project'
import type { ProjectRepository } from '../../../../domain/ports/outbound/project.repository'

interface ProjectRow {
  id: string
  name: string
  description: string
  instructions: string
  is_favorite: number
  created_at: string
  updated_at: string
}

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: Database.Database) {}

  async findAll(): Promise<Project[]> {
    const rows = this.db
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
      .all() as ProjectRow[]

    return rows.map(this.toDomain)
  }

  async findById(id: string): Promise<Project | null> {
    const row = this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(id) as ProjectRow | undefined

    return row ? this.toDomain(row) : null
  }

  async save(project: Project): Promise<void> {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO projects (id, name, description, instructions, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(project.id, project.name, project.description, project.instructions, project.isFavorite ? 1 : 0, project.createdAt.toISOString(), project.updatedAt.toISOString())
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  }

  async deleteAll(): Promise<void> {
    this.db.prepare('DELETE FROM projects').run()
  }

  private toDomain(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      isFavorite: row.is_favorite === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
