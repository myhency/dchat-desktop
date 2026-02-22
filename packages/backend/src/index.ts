import { createContainer } from './container'
import { createApp } from './server'
import { closeDatabase } from './adapters/outbound/persistence/sqlite/connection'

const PORT = parseInt(process.env.PORT || '3131', 10)

async function main(): Promise<void> {
  const container = createContainer()
  await container.restoreApiKeys()

  const app = createApp(container)

  const server = app.listen(PORT, () => {
    console.log(`D Chat backend listening on port ${PORT}`)
  })

  // Graceful shutdown
  const shutdown = (): void => {
    server.close(() => {
      closeDatabase()
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
