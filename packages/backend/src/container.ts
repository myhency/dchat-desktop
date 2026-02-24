/**
 * Composition Root — 모든 의존성 와이어링 (Electron 의존성 없음)
 */

import { getDatabase } from './adapters/outbound/persistence/sqlite/connection'

// Outbound Adapters
import { SqliteMessageRepository } from './adapters/outbound/persistence/sqlite/message.repository.impl'
import { SqliteSessionRepository } from './adapters/outbound/persistence/sqlite/session.repository.impl'
import { SqliteSettingsRepository } from './adapters/outbound/persistence/sqlite/settings.repository.impl'
import { SqliteProjectRepository } from './adapters/outbound/persistence/sqlite/project.repository.impl'
import { JsonFileMcpServerRepository } from './adapters/outbound/persistence/json/mcp-config.repository'
import { LLMAdapterFactory } from './adapters/outbound/llm/llm-adapter.factory'
import { StdioMcpClientManager } from './adapters/outbound/mcp/stdio-mcp-client.manager'

// Domain Services
import { ChatService } from './domain/services/chat.service'
import { SessionService } from './domain/services/session.service'
import { SettingsService } from './domain/services/settings.service'
import { ProjectService } from './domain/services/project.service'
import { BackupService } from './domain/services/backup.service'
import { McpServerService } from './domain/services/mcp-server.service'
import { MemoryService } from './domain/services/memory.service'

// Domain Ports
import type { LLMGatewayResolver } from './domain/ports/outbound/llm-gateway.resolver'
import type { McpClientGateway } from './domain/ports/outbound/mcp-client.gateway'

export interface AppContainer {
  chatService: ChatService
  sessionService: SessionService
  settingsService: SettingsService
  projectService: ProjectService
  backupService: BackupService
  mcpServerService: McpServerService
  memoryService: MemoryService
  mcpClient: McpClientGateway
  llmFactory: LLMGatewayResolver
  restoreApiKeys(): Promise<void>
  startMcpServers(): Promise<void>
}

export function createContainer(): AppContainer {
  const db = getDatabase()

  // Outbound Adapters
  const messageRepo = new SqliteMessageRepository(db)
  const sessionRepo = new SqliteSessionRepository(db)
  const settingsRepo = new SqliteSettingsRepository(db)
  const projectRepo = new SqliteProjectRepository(db)
  const mcpServerRepo = new JsonFileMcpServerRepository()
  const llmFactory = new LLMAdapterFactory()
  const mcpClient = new StdioMcpClientManager()

  // Domain Services
  const memoryService = new MemoryService(messageRepo, settingsRepo, llmFactory)
  const chatService = new ChatService(messageRepo, sessionRepo, llmFactory, settingsRepo, projectRepo, mcpClient, memoryService)
  const sessionService = new SessionService(sessionRepo, messageRepo)
  const settingsService = new SettingsService(settingsRepo)
  const projectService = new ProjectService(projectRepo)
  const backupService = new BackupService(messageRepo, sessionRepo, projectRepo, settingsRepo)
  const mcpServerService = new McpServerService(mcpServerRepo, mcpClient)

  return {
    chatService,
    sessionService,
    settingsService,
    projectService,
    backupService,
    mcpServerService,
    memoryService,
    mcpClient,
    llmFactory,

    async restoreApiKeys(): Promise<void> {
      const anthropicKey = await settingsService.get('anthropic_api_key')
      const anthropicBaseUrl = await settingsService.get('anthropic_base_url')
      if (anthropicKey) llmFactory.configureProvider('anthropic', anthropicKey, anthropicBaseUrl || undefined)

      const openaiKey = await settingsService.get('openai_api_key')
      const openaiBaseUrl = await settingsService.get('openai_base_url')
      if (openaiKey) llmFactory.configureProvider('openai', openaiKey, openaiBaseUrl || undefined)
    },

    async startMcpServers(): Promise<void> {
      await mcpServerService.startEnabledServers()
    }
  }
}
