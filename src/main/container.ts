/**
 * Composition Root - 모든 의존성 와이어링이 이 파일에서 이루어짐
 */

import type { BrowserWindow } from 'electron'
import { getDatabase } from './adapters/outbound/persistence/sqlite/connection'

// Outbound Adapters
import { SqliteMessageRepository } from './adapters/outbound/persistence/sqlite/message.repository.impl'
import { SqliteSessionRepository } from './adapters/outbound/persistence/sqlite/session.repository.impl'
import { SqliteSettingsRepository } from './adapters/outbound/persistence/sqlite/settings.repository.impl'
import { LLMAdapterFactory } from './adapters/outbound/llm/llm-adapter.factory'

// Domain Services
import { ChatService } from './domain/services/chat.service'
import { SessionService } from './domain/services/session.service'
import { SettingsService } from './domain/services/settings.service'

// Inbound Adapters
import { ChatIpcHandler } from './adapters/inbound/ipc/chat.ipc-handler'
import { SessionIpcHandler } from './adapters/inbound/ipc/session.ipc-handler'
import { SettingsIpcHandler } from './adapters/inbound/ipc/settings.ipc-handler'

export interface AppContainer {
  registerIpc(getWindow: () => BrowserWindow | null): void
  restoreApiKeys(): Promise<void>
}

export function createContainer(): AppContainer {
  const db = getDatabase()

  // Outbound Adapters
  const messageRepo = new SqliteMessageRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  const settingsRepo = new SqliteSettingsRepository(db)
  const llmFactory = new LLMAdapterFactory()

  // Domain Services
  const chatService = new ChatService(messageRepo, sessionRepo, llmFactory)
  const sessionService = new SessionService(sessionRepo, messageRepo)
  const settingsService = new SettingsService(settingsRepo)

  // Inbound Adapters
  const chatIpcHandler = new ChatIpcHandler(chatService, messageRepo, chatService, chatService)
  const sessionIpcHandler = new SessionIpcHandler(sessionService)
  const settingsIpcHandler = new SettingsIpcHandler(settingsService, llmFactory)

  return {
    registerIpc(getWindow: () => BrowserWindow | null): void {
      chatIpcHandler.register(getWindow)
      sessionIpcHandler.register()
      settingsIpcHandler.register()
    },

    async restoreApiKeys(): Promise<void> {
      const anthropicKey = await settingsService.get('anthropic_api_key')
      if (anthropicKey) llmFactory.setAnthropicKey(anthropicKey)

      const openaiKey = await settingsService.get('openai_api_key')
      if (openaiKey) llmFactory.setOpenAIKey(openaiKey)
    }
  }
}
