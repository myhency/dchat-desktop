import { Router, type Request, type Response, type NextFunction } from 'express'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir, release, totalmem, freemem } from 'os'
import AdmZip from 'adm-zip'
import type { ManageMcpServersUseCase } from '../../../domain/ports/inbound/manage-mcp-servers.usecase'
import type { ManageSettingsUseCase } from '../../../domain/ports/inbound/manage-settings.usecase'
import logger from '../../../logger'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const SENSITIVE_KEY_PATTERN = /api_key|secret|password|token/i

function maskSensitiveValues(settings: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(settings)) {
    masked[key] = SENSITIVE_KEY_PATTERN.test(key) ? '***REDACTED***' : value
  }
  return masked
}

export interface DiagnosticDeps {
  mcpService: ManageMcpServersUseCase
  settingsService: ManageSettingsUseCase
  getDbStats: () => { sessions: number; messages: number; dbSizeBytes: number }
}

export function createDiagnosticRoutes(deps: DiagnosticDeps): Router {
  const { mcpService, settingsService, getDbStats } = deps
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
    } catch (err) {
      logger.warn({ err }, 'Failed to collect backend log')
    }

    // 2. Crash reports
    try {
      const crashDir = join(homedir(), '.dchat', 'crash-reports')
      const files = readdirSync(crashDir).filter((f) => f.startsWith('error-') && f.endsWith('.txt'))
      for (const file of files) {
        try {
          const content = readFileSync(join(crashDir, file), 'utf-8')
          zip.addFile(`${prefix}/crash-reports/${file}`, Buffer.from(content, 'utf-8'))
        } catch (err) {
          logger.warn({ err, file }, 'Failed to collect crash report file')
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to collect crash reports')
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
        } catch (err) {
          logger.warn({ err, serverId: srv.config.id }, 'Failed to collect MCP server logs')
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to collect MCP server logs')
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
    } catch (err) {
      logger.warn({ err }, 'Failed to collect frontend logs')
    }

    // 5. System info
    try {
      const systemInfo = {
        node: { version: process.version, platform: process.platform, arch: process.arch },
        os: { release: release(), totalMemory: totalmem(), freeMemory: freemem() },
        process: { uptime: process.uptime(), memoryUsage: process.memoryUsage(), pid: process.pid },
        exportedAt: new Date().toISOString(),
      }
      zip.addFile(`${prefix}/system-info.json`, Buffer.from(JSON.stringify(systemInfo, null, 2), 'utf-8'))
    } catch (err) {
      logger.warn({ err }, 'Failed to collect system info')
    }

    // 6. Settings snapshot (API keys masked)
    try {
      const allSettings = await settingsService.getAll()
      const masked = maskSensitiveValues(allSettings)
      zip.addFile(`${prefix}/settings.json`, Buffer.from(JSON.stringify(masked, null, 2), 'utf-8'))
    } catch (err) {
      logger.warn({ err }, 'Failed to collect settings')
    }

    // 7. DB stats
    try {
      const stats = getDbStats()
      zip.addFile(`${prefix}/db-stats.json`, Buffer.from(JSON.stringify(stats, null, 2), 'utf-8'))
    } catch (err) {
      logger.warn({ err }, 'Failed to collect DB stats')
    }

    // 8. MCP server config (env excluded)
    try {
      const statuses = await mcpService.getServerStatuses()
      const mcpConfig = statuses.map((srv) => ({
        id: srv.config.id,
        name: srv.config.name,
        command: srv.config.command,
        args: srv.config.args,
        enabled: srv.config.enabled,
        status: srv.status,
        toolCount: srv.tools.length,
      }))
      zip.addFile(`${prefix}/mcp-config.json`, Buffer.from(JSON.stringify(mcpConfig, null, 2), 'utf-8'))
    } catch (err) {
      logger.warn({ err }, 'Failed to collect MCP config')
    }

    const buffer = zip.toBuffer()
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', `attachment; filename="${prefix}.zip"`)
    res.send(buffer)
  }))

  return router
}
