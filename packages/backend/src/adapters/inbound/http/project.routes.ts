import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageProjectUseCase } from '../../../domain/ports/inbound/manage-project.usecase'
import type { CreateProjectRequest, UpdateInstructionsRequest } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createProjectRoutes(projectService: ManageProjectUseCase): Router {
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

  return router
}
