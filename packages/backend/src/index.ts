import { createContainer } from './container'
import { createApp } from './server'
import { closeDatabase } from './adapters/outbound/persistence/sqlite/connection'
import logger from './logger'

const PORT = parseInt(process.env.PORT || '3131', 10)

async function main(): Promise<void> {
  const container = createContainer()
  await container.restoreApiKeys()

  const app = createApp(container)

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'D Chat backend listening')
  })

  // Graceful shutdown
  const shutdown = (): void => {
    logger.info('Shutting down server')
    server.close(() => {
      closeDatabase()
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server')
  process.exit(1)
})
