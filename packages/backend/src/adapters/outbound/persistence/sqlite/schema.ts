import type Database from 'better-sqlite3'

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  `)

  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN project_id TEXT DEFAULT NULL`)
  } catch {
    // column already exists
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN instructions TEXT NOT NULL DEFAULT ''`)
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE messages ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'`)
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE messages ADD COLUMN segments TEXT DEFAULT NULL`)
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN memory_content TEXT NOT NULL DEFAULT ''`)
  } catch {
    // column already exists
  }

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN memory_updated_at TEXT DEFAULT NULL`)
  } catch {
    // column already exists
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      args TEXT NOT NULL DEFAULT '[]',
      env TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}
