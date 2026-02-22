import type Database from 'better-sqlite3'
import type { McpServerConfig } from '../../../../domain/entities/mcp-server'
import type { McpServerRepository } from '../../../../domain/ports/outbound/mcp-server.repository'

interface McpServerRow {
  id: string
  name: string
  command: string
  args: string
  env: string
  enabled: number
  created_at: string
  updated_at: string
}

export class SqliteMcpServerRepository implements McpServerRepository {
  constructor(private readonly db: Database.Database) {}

  getConfigPath(): string {
    return ''
  }

  async findAll(): Promise<McpServerConfig[]> {
    const rows = this.db
      .prepare('SELECT * FROM mcp_servers ORDER BY created_at ASC')
      .all() as McpServerRow[]

    return rows.map(this.toDomain)
  }

  async findById(id: string): Promise<McpServerConfig | null> {
    const row = this.db
      .prepare('SELECT * FROM mcp_servers WHERE id = ?')
      .get(id) as McpServerRow | undefined

    return row ? this.toDomain(row) : null
  }

  async save(config: McpServerConfig): Promise<void> {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO mcp_servers (id, name, command, args, env, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        config.id,
        config.name,
        config.command,
        JSON.stringify(config.args),
        JSON.stringify(config.env),
        config.enabled ? 1 : 0,
        config.createdAt.toISOString(),
        config.updatedAt.toISOString()
      )
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id)
  }

  private toDomain(row: McpServerRow): McpServerConfig {
    return {
      id: row.id,
      name: row.name,
      command: row.command,
      args: JSON.parse(row.args),
      env: JSON.parse(row.env),
      enabled: row.enabled === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
