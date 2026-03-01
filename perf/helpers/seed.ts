import BetterSqlite3 from 'better-sqlite3'
import { initSchema } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/schema'
import crypto from 'crypto'

export interface SeedOptions {
  sessionCount: number
  messagesPerSession: number
  contentLength?: number
}

export interface SeedResult {
  db: BetterSqlite3.Database
  firstSessionId: string
  sessionIds: string[]
}

const SAMPLE_CONTENT_BLOCKS = [
  '이것은 테스트 메시지입니다. 성능 측정을 위한 데이터입니다.',
  '```typescript\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n\n  return fibonacci(n - 1) + fibonacci(n - 2)\n}\n```',
  '# Heading\n\n- Item 1\n- Item 2\n- Item 3\n\n> Blockquote with some text',
  'The quick brown fox jumps over the lazy dog. Performance testing is important for ensuring application reliability.',
  '| Column A | Column B | Column C |\n|----------|----------|----------|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |'
]

function generateContent(index: number, contentLength?: number): string {
  const base = SAMPLE_CONTENT_BLOCKS[index % SAMPLE_CONTENT_BLOCKS.length]
  if (!contentLength || base.length >= contentLength) return base
  return base + ' '.repeat(contentLength - base.length)
}

export function createSeededDb(options: SeedOptions): SeedResult {
  const { sessionCount, messagesPerSession, contentLength } = options
  const db = new BetterSqlite3(':memory:')
  initSchema(db)

  const sessionIds: string[] = []
  const now = new Date()

  const insertSession = db.prepare(
    'INSERT INTO sessions (id, title, model, is_favorite, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
  )
  const insertMessage = db.prepare(
    'INSERT INTO messages (id, session_id, role, content, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const seed = db.transaction(() => {
    for (let s = 0; s < sessionCount; s++) {
      const sessionId = crypto.randomUUID()
      sessionIds.push(sessionId)
      const createdAt = new Date(now.getTime() - (sessionCount - s) * 60_000).toISOString()
      insertSession.run(sessionId, `Session ${s}`, 'claude-haiku-4-5', createdAt, createdAt)

      for (let m = 0; m < messagesPerSession; m++) {
        const messageId = crypto.randomUUID()
        const role = m % 2 === 0 ? 'user' : 'assistant'
        const content = generateContent(m, contentLength)
        const msgCreatedAt = new Date(now.getTime() - (sessionCount - s) * 60_000 + m * 1000).toISOString()
        insertMessage.run(messageId, sessionId, role, content, '[]', msgCreatedAt)
      }
    }
  })

  seed()

  return {
    db,
    firstSessionId: sessionIds[0],
    sessionIds
  }
}
