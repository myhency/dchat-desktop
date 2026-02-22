import { Router, type Request, type Response, type NextFunction } from 'express'
import type { BackupRestoreUseCase } from '../../../domain/ports/inbound/backup-restore.usecase'
import type { BackupData } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createBackupRoutes(backupService: BackupRestoreUseCase): Router {
  const router = Router()

  router.get('/export', asyncHandler(async (_req: Request, res: Response) => {
    const data = await backupService.exportBackup()
    res.setHeader('Content-Disposition', 'attachment; filename="dchat-backup.json"')
    res.json(data)
  }))

  router.post('/import', asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as BackupData
    await backupService.importBackup(data)
    res.json({ ok: true })
  }))

  return router
}
