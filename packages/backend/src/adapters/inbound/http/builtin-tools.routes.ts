import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { BuiltInToolProvider } from '../../outbound/builtin-tools/builtin-tool-provider'

export function createBuiltinToolsRoutes(builtInTools: BuiltInToolProvider): Router {
  const router = Router()

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)

  // GET /api/builtin-tools/status
  router.get('/status', asyncHandler(async (_req, res) => {
    const status = await builtInTools.getStatus()
    res.json(status)
  }))

  return router
}
