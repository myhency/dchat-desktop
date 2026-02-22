import type Database from 'better-sqlite3'
import type { SettingsRepository } from '../../../../domain/ports/outbound/settings.repository'

interface SettingsRow {
  key: string
  value: string
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  async get(key: string): Promise<string | null> {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as SettingsRow | undefined

    return row?.value ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, value)
  }

  async delete(key: string): Promise<void> {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = this.db.prepare('SELECT * FROM settings').all() as SettingsRow[]

    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  }

  async deleteAll(): Promise<void> {
    this.db.prepare('DELETE FROM settings').run()
  }
}
