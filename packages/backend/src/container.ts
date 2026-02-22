/**
 * Composition Root — 모든 의존성 와이어링 (Electron 의존성 없음)
 */

import { getDatabase } from './adapters/outbound/persistence/sqlite/connection'

// Outbound Adapters
import { SqliteMessageRepository } from './adapters/outbound/persistence/sqlite/message.repository.impl'
import { SqliteSessionRepository } from './adapters/outbound/persistence/sqlite/session.repository.impl'
import { SqliteSettingsRepository } from './adapters/outbound/persistence/sqlite/settings.repository.impl'
import { SqliteProjectRepository } from './adapters/outbound/persistence/sqlite/project.repository.impl'
import { LLMAdapterFactory } from './adapters/outbound/llm/llm-adapter.factory'

// Domain Services
import { ChatService } from './domain/services/chat.service'
import { SessionService } from './domain/services/session.service'
import { SettingsService } from './domain/services/settings.service'
import { ProjectService } from './domain/services/project.service'

export interface AppContainer {
  chatService: ChatService
  sessionService: SessionService
  settingsService: SettingsService
  projectService: ProjectService
  llmFactory: LLMAdapterFactory
  messageRepo: SqliteMessageRepository
  restoreApiKeys(): Promise<void>
}

export function createContainer(): AppContainer {
  const db = getDatabase()

  // Outbound Adapters
  const messageRepo = new SqliteMessageRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  const settingsRepo = new SqliteSettingsRepository(db)
  const projectRepo = new SqliteProjectRepository(db)
  const llmFactory = new LLMAdapterFactory()

  // Domain Services
  const chatService = new ChatService(messageRepo, sessionRepo, llmFactory, settingsRepo, projectRepo)
  const sessionService = new SessionService(sessionRepo, messageRepo)
  const settingsService = new SettingsService(settingsRepo)
  const projectService = new ProjectService(projectRepo)

  return {
    chatService,
    sessionService,
    settingsService,
    projectService,
    llmFactory,
    messageRepo,

    async restoreApiKeys(): Promise<void> {
      const anthropicKey = await settingsService.get('anthropic_api_key')
      const anthropicBaseUrl = await settingsService.get('anthropic_base_url')
      if (anthropicKey) llmFactory.setAnthropicKey(anthropicKey, anthropicBaseUrl || undefined)

      const openaiKey = await settingsService.get('openai_api_key')
      const openaiBaseUrl = await settingsService.get('openai_base_url')
      if (openaiKey) llmFactory.setOpenAIKey(openaiKey, openaiBaseUrl || undefined)
    }
  }
}
