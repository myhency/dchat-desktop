import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { ManageMcpServersUseCase } from '../../../domain/ports/inbound/manage-mcp-servers.usecase'
import type { CreateMcpServerRequest, UpdateMcpServerRequest } from '@dchat/shared'

export function createMcpServerRoutes(useCase: ManageMcpServersUseCase): Router {
  const router = Router()

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)

  // GET /api/mcp/servers
  router.get('/servers', asyncHandler(async (_req, res) => {
    const servers = await useCase.listServers()
    res.json(servers)
  }))

  // GET /api/mcp/servers/status
  router.get('/servers/status', asyncHandler(async (_req, res) => {
    const statuses = await useCase.getServerStatuses()
    res.json(statuses)
  }))

  // POST /api/mcp/servers
  router.post('/servers', asyncHandler(async (req, res) => {
    const { name, command, args, env } = req.body as CreateMcpServerRequest
    const server = await useCase.createServer(name, command, args, env ?? {})
    res.status(201).json(server)
  }))

  // PUT /api/mcp/servers/:id
  router.put('/servers/:id', asyncHandler(async (req, res) => {
    const updates = req.body as UpdateMcpServerRequest
    const server = await useCase.updateServer(req.params.id, updates)
    res.json(server)
  }))

  // DELETE /api/mcp/servers/:id
  router.delete('/servers/:id', asyncHandler(async (req, res) => {
    await useCase.deleteServer(req.params.id)
    res.json({ ok: true })
  }))

  // POST /api/mcp/servers/:id/start
  router.post('/servers/:id/start', asyncHandler(async (req, res) => {
    await useCase.startServer(req.params.id)
    res.json({ ok: true })
  }))

  // POST /api/mcp/servers/:id/stop
  router.post('/servers/:id/stop', asyncHandler(async (req, res) => {
    await useCase.stopServer(req.params.id)
    res.json({ ok: true })
  }))

  // POST /api/mcp/servers/:id/restart
  router.post('/servers/:id/restart', asyncHandler(async (req, res) => {
    await useCase.restartServer(req.params.id)
    res.json({ ok: true })
  }))

  // GET /api/mcp/servers/:id/logs
  router.get('/servers/:id/logs', asyncHandler(async (req, res) => {
    const logs = useCase.getServerLogs(req.params.id)
    res.json(logs)
  }))

  // GET /api/mcp/config-path
  router.get('/config-path', (_req, res) => {
    res.json({ path: useCase.getConfigPath() })
  })

  // POST /api/mcp/reload
  router.post('/reload', asyncHandler(async (_req, res) => {
    await useCase.reloadConfig()
    res.json({ ok: true })
  }))

  return router
}
