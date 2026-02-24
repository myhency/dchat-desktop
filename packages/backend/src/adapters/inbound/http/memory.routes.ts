import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageMemoryUseCase } from '../../../domain/ports/inbound/manage-memory.usecase'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createMemoryRoutes(memoryService: ManageMemoryUseCase): Router {
  const router = Router()

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const memory = await memoryService.getMemory()
    res.json(memory)
  }))

  router.delete('/', asyncHandler(async (_req: Request, res: Response) => {
    await memoryService.deleteMemory()
    res.json({ ok: true })
  }))

  router.post('/edit', asyncHandler(async (req: Request, res: Response) => {
    const { instruction, model } = req.body
    if (!instruction || !model) {
      res.status(400).json({ error: 'instruction and model are required' })
      return
    }
    const result = await memoryService.editMemory(instruction, model)
    res.json(result)
  }))

  return router
}
