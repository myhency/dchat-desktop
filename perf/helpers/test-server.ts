import type { Server } from 'http'
import BetterSqlite3 from 'better-sqlite3'
import { initSchema } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/schema'
import { SqliteMessageRepository } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/message.repository.impl'
import { SqliteSessionRepository } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/session.repository.impl'
import { SqliteSettingsRepository } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/settings.repository.impl'
import { SqliteProjectRepository } from '../../packages/backend/src/adapters/outbound/persistence/sqlite/project.repository.impl'
import { ChatService } from '../../packages/backend/src/domain/services/chat.service'
import { SessionService } from '../../packages/backend/src/domain/services/session.service'
import { SettingsService } from '../../packages/backend/src/domain/services/settings.service'
import { ProjectService } from '../../packages/backend/src/domain/services/project.service'
import { createApp } from '../../packages/backend/src/server'
import { createPerfMockGateway, type PerfMockOptions } from './mock-llm'
import { createSeededDb } from './seed'

export interface PerfServerOptions {
  seedSessions?: number
  messagesPerSession?: number
  mockLlmDelay?: number
  mockLlmTokens?: number
}

export interface PerfServer {
  baseUrl: string
  close(): Promise<void>
}

export async function startPerfServer(options: PerfServerOptions = {}): Promise<PerfServer> {
  const { seedSessions = 10, messagesPerSession = 10, mockLlmDelay = 0, mockLlmTokens = 100 } = options

  let db: BetterSqlite3.Database
  if (seedSessions > 0 && messagesPerSession > 0) {
    const seeded = createSeededDb({ sessionCount: seedSessions, messagesPerSession })
    db = seeded.db
  } else {
    db = new BetterSqlite3(':memory:')
    initSchema(db)
  }

  const messageRepo = new SqliteMessageRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  const settingsRepo = new SqliteSettingsRepository(db)
  const projectRepo = new SqliteProjectRepository(db)

  const mockGateway = createPerfMockGateway({
    responseTokens: mockLlmTokens,
    delayMs: mockLlmDelay
  })
  const llmFactory = {
    getGateway: () => mockGateway,
    listAllModels: () => mockGateway.listModels(),
    configureProvider: () => {},
    testConnection: async () => {}
  }

  const chatService = new ChatService(messageRepo, sessionRepo, llmFactory, settingsRepo, projectRepo)
  const sessionService = new SessionService(sessionRepo, messageRepo)
  const settingsService = new SettingsService(settingsRepo)
  const projectService = new ProjectService(projectRepo)

  const container = {
    chatService,
    sessionService,
    settingsService,
    projectService,
    llmFactory,
    async restoreApiKeys() {}
  } as any

  const app = createApp(container)

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })

  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  const baseUrl = `http://127.0.0.1:${port}`

  return {
    baseUrl,
    close() {
      return new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    }
  }
}
