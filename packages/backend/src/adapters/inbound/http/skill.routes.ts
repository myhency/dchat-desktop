import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageSkillUseCase } from '../../../domain/ports/inbound/manage-skill.usecase'
import type { CreateSkillRequest, UpdateSkillRequest } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createSkillRoutes(skillService: ManageSkillUseCase): Router {
  const router = Router()

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, description, content } = req.body as CreateSkillRequest
    if (!name || !content) {
      res.status(400).json({ error: 'name and content are required' })
      return
    }
    const skill = await skillService.create(name, description || '', content)
    res.json(skill)
  }))

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const skills = await skillService.list()
    res.json(skills)
  }))

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.getById(req.params.id)
    res.json(skill)
  }))

  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const updates = req.body as UpdateSkillRequest
    const skill = await skillService.update(req.params.id, updates)
    res.json(skill)
  }))

  router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.toggleEnabled(req.params.id)
    res.json(skill)
  }))

  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await skillService.delete(req.params.id)
    res.json({ ok: true })
  }))

  return router
}
