import { Router, type Request, type Response, type NextFunction } from 'express'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import AdmZip from 'adm-zip'
import type { ManageMcpServersUseCase } from '../../../domain/ports/inbound/manage-mcp-servers.usecase'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createDiagnosticRoutes(mcpService: ManageMcpServersUseCase): Router {
  const router = Router()

  router.post('/export', asyncHandler(async (req: Request, res: Response) => {
    const zip = new AdmZip()
    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    // 1. Backend log file
    try {
      const logPath = process.env.DCHAT_LOG_PATH
      if (logPath) {
        const content = readFileSync(logPath, 'utf-8')
        zip.addFile(`${prefix}/backend.log`, Buffer.from(content, 'utf-8'))
      }
    } catch {
      // skip if file not found or unreadable
    }

    // 2. Crash reports
    try {
      const crashDir = join(homedir(), '.dchat', 'crash-reports')
      const files = readdirSync(crashDir).filter((f) => f.startsWith('error-') && f.endsWith('.txt'))
      for (const file of files) {
        try {
          const content = readFileSync(join(crashDir, file), 'utf-8')
          zip.addFile(`${prefix}/crash-reports/${file}`, Buffer.from(content, 'utf-8'))
        } catch {
          // skip individual file errors
        }
      }
    } catch {
      // skip if directory not found
    }

    // 3. MCP server logs (in-memory)
    try {
      const statuses = await mcpService.getServerStatuses()
      for (const srv of statuses) {
        try {
          const logs = mcpService.getServerLogs(srv.config.id)
          if (logs.length > 0) {
            zip.addFile(`${prefix}/mcp-logs/${srv.config.name}.log`, Buffer.from(logs.join('\n'), 'utf-8'))
          }
        } catch {
          // skip individual server errors
        }
      }
    } catch {
      // skip if mcp service errors
    }

    // 4. Frontend logs (from request body)
    try {
      const frontendLogs = req.body?.frontendLogs
      if (Array.isArray(frontendLogs) && frontendLogs.length > 0) {
        const lines = frontendLogs.map((entry: { timestamp?: string; level?: string; message?: string }) => {
          const ts = entry.timestamp ?? ''
          const level = (entry.level ?? 'log').toUpperCase()
          const msg = entry.message ?? ''
          return `[${ts}] [${level}] ${msg}`
        })
        zip.addFile(`${prefix}/frontend.log`, Buffer.from(lines.join('\n'), 'utf-8'))
      }
    } catch {
      // skip if malformed data
    }

    const buffer = zip.toBuffer()
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="${prefix}.zip"`)
    res.send(buffer)
  }))

  return router
}
