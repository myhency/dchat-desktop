import { Router, type Request, type Response, type NextFunction } from 'express'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createErrorReportRoutes(): Router {
  const router = Router()

  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { report } = req.body
    if (!report || typeof report !== 'string') {
      res.status(400).json({ error: 'report is required' })
      return
    }

    const dir = join(homedir(), '.dchat', 'crash-reports')
    mkdirSync(dir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const fileName = `error-${timestamp}.txt`
    const filePath = join(dir, fileName)

    writeFileSync(filePath, report, 'utf-8')

    res.json({ ok: true, filePath })
  }))

  return router
}
