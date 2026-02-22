import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageSessionUseCase } from '../../../domain/ports/inbound/manage-session.usecase'
import type { CreateSessionRequest, UpdateModelRequest, UpdateTitleRequest } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createSessionRoutes(sessionService: ManageSessionUseCase): Router {
  const router = Router()

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { title, model, projectId } = req.body as CreateSessionRequest
    const session = await sessionService.create(title, model, projectId)
    res.json(session)
  }))

  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const projectId = req.query.projectId as string | undefined
    if (projectId) {
      const sessions = await sessionService.listByProjectId(projectId)
      res.json(sessions)
    } else {
      const sessions = await sessionService.list()
      res.json(sessions)
    }
  }))

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const session = await sessionService.getById(req.params.id)
    if (!session) {
      res.status(404).json({ error: 'Session not found' })
      return
    }
    res.json(session)
  }))

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await sessionService.delete(req.params.id)
    res.json({ ok: true })
  }))

  router.patch('/:id/model', asyncHandler(async (req: Request, res: Response) => {
    const { model } = req.body as UpdateModelRequest
    const session = await sessionService.updateModel(req.params.id, model)
    res.json(session)
  }))

  router.patch('/:id/title', asyncHandler(async (req: Request, res: Response) => {
    const { title } = req.body as UpdateTitleRequest
    const session = await sessionService.updateTitle(req.params.id, title)
    res.json(session)
  }))

  router.patch('/:id/favorite', asyncHandler(async (req: Request, res: Response) => {
    const session = await sessionService.toggleFavorite(req.params.id)
    res.json(session)
  }))

  router.patch('/:id/project', asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.body as { projectId: string | null }
    const session = await sessionService.updateProjectId(req.params.id, projectId)
    res.json(session)
  }))

  return router
}
