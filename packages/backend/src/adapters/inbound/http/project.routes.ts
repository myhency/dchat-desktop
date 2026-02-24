import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageProjectUseCase } from '../../../domain/ports/inbound/manage-project.usecase'
import type { MemoryService } from '../../../domain/services/memory.service'
import type { CreateProjectRequest, UpdateInstructionsRequest, EditProjectMemoryRequest } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createProjectRoutes(projectService: ManageProjectUseCase, memoryService: MemoryService): Router {
  const router = Router()

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body as CreateProjectRequest
    const project = await projectService.create(name, description)
    res.json(project)
  }))

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const projects = await projectService.list()
    res.json(projects)
  }))

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await projectService.delete(req.params.id)
    res.json({ ok: true })
  }))

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body as CreateProjectRequest
    const project = await projectService.update(req.params.id, name, description)
    res.json(project)
  }))

  router.put('/:id/instructions', asyncHandler(async (req: Request, res: Response) => {
    const { instructions } = req.body as UpdateInstructionsRequest
    const project = await projectService.updateInstructions(req.params.id, instructions)
    res.json(project)
  }))

  router.patch('/:id/favorite', asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.toggleFavorite(req.params.id)
    res.json(project)
  }))

  // ── Project Memory ──

  router.get('/:id/memory', asyncHandler(async (req: Request, res: Response) => {
    const memory = await memoryService.getProjectMemory(req.params.id)
    res.json(memory)
  }))

  router.delete('/:id/memory', asyncHandler(async (req: Request, res: Response) => {
    await memoryService.deleteProjectMemory(req.params.id)
    res.json({ ok: true })
  }))

  router.post('/:id/memory/edit', asyncHandler(async (req: Request, res: Response) => {
    const { instruction, model } = req.body as EditProjectMemoryRequest
    if (!instruction || !model) {
      res.status(400).json({ error: 'instruction and model are required' })
      return
    }
    const result = await memoryService.editProjectMemory(req.params.id, instruction, model)
    res.json(result)
  }))

  return router
}
