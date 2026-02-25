import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import { initSchema } from './schema'
import logger from '../../../../logger'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = process.env.DCHAT_DB_PATH || join(homedir(), '.dchat', 'dchat.db')

  // Ensure directory exists
  const dir = join(dbPath, '..')
  mkdirSync(dir, { recursive: true })

  logger.info({ dbPath }, 'Database connected')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
