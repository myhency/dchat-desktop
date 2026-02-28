import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageSkillUseCase } from '../../../domain/ports/inbound/manage-skill.usecase'
import type { SkillRepository } from '../../../domain/ports/outbound/skill.repository'
import type { CreateSkillRequest, UpdateSkillRequest } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createSkillRoutes(skillService: ManageSkillUseCase, skillRepo: SkillRepository): Router {
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

  router.post('/upload', asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.body
    if (type === 'archive') {
      const { data } = req.body as { type: 'archive'; data: string }
      if (!data) {
        res.status(400).json({ error: 'data is required' })
        return
      }
      const buffer = Buffer.from(data, 'base64')
      const skill = await skillService.uploadArchive(buffer)
      res.json(skill)
    } else if (type === 'files') {
      const { files } = req.body as { type: 'files'; files: { relativePath: string; data: string }[] }
      if (!files || !Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: 'files array is required' })
        return
      }
      const bufferFiles = files.map((f) => ({
        relativePath: f.relativePath,
        data: Buffer.from(f.data, 'base64')
      }))
      const skill = await skillService.uploadFiles(bufferFiles)
      res.json(skill)
    } else {
      res.status(400).json({ error: 'type must be "archive" or "files"' })
    }
  }))

  router.get('/config', asyncHandler(async (_req: Request, res: Response) => {
    res.json({ skillsPath: skillRepo.getSkillsPath() })
  }))

  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const skill = await skillService.getById(req.params.id)
    res.json(skill)
  }))

  router.get('/:id/file', asyncHandler(async (req: Request, res: Response) => {
    const relativePath = req.query.path as string
    if (!relativePath) {
      res.status(400).json({ error: 'path query parameter is required' })
      return
    }
    const content = await skillRepo.readFile(req.params.id, relativePath)
    res.type('text/plain').send(content)
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
