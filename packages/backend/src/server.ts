import express from 'express'
import cors from 'cors'
import type { AppContainer } from './container'
import { createSessionRoutes } from './adapters/inbound/http/session.routes'
import { createChatRoutes } from './adapters/inbound/http/chat.routes'
import { createSettingsRoutes } from './adapters/inbound/http/settings.routes'
import { createProjectRoutes } from './adapters/inbound/http/project.routes'
import { createModelsRoutes } from './adapters/inbound/http/models.routes'
import { createBackupRoutes } from './adapters/inbound/http/backup.routes'
import { createMcpServerRoutes } from './adapters/inbound/http/mcp-server.routes'
import logger from './logger'

export function createApp(container: AppContainer): express.Express {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      logger.info({ method: req.method, url: req.originalUrl, statusCode: res.statusCode, duration: Date.now() - start }, 'HTTP request')
    })
    next()
  })

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Routes
  app.use('/api/sessions', createSessionRoutes(container.sessionService))
  app.use(
    '/api/chat',
    createChatRoutes(
      container.chatService,
      container.chatService,
      container.chatService,
      container.chatService
    )
  )
  app.use('/api/settings', createSettingsRoutes(container.settingsService, container.llmFactory))
  app.use('/api/projects', createProjectRoutes(container.projectService))
  app.use('/api/models', createModelsRoutes(container.llmFactory))
  app.use('/api/backup', createBackupRoutes(container.backupService))
  app.use('/api/mcp', createMcpServerRoutes(container.mcpServerService))

  // Global error handler — Express 4 does not catch rejected promises from async handlers
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error')
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    }
  })

  return app
}
