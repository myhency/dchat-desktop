import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import type { Server } from 'http'
import { existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import AdmZip from 'adm-zip'

let mockHome = ''
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, homedir: () => mockHome }
})

const { createDiagnosticRoutes } = await import('../adapters/inbound/http/diagnostic.routes')

let server: Server
let baseUrl: string

const mockMcpService = {
  getServerStatuses: vi.fn(),
  getServerLogs: vi.fn(),
  listServers: vi.fn(),
  createServer: vi.fn(),
  updateServer: vi.fn(),
  deleteServer: vi.fn(),
  startServer: vi.fn(),
  stopServer: vi.fn(),
  restartServer: vi.fn(),
  startEnabledServers: vi.fn(),
  getConfigPath: vi.fn(),
  reloadConfig: vi.fn(),
}

beforeAll(async () => {
  const app = express()
  app.use('/api/diagnostics', createDiagnosticRoutes(mockMcpService as any))

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`
      }
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
})

beforeEach(() => {
  mockHome = mkdtempSync(join(tmpdir(), 'dchat-diag-test-'))
  mockMcpService.getServerStatuses.mockReset()
  mockMcpService.getServerLogs.mockReset()
})

afterEach(() => {
  delete process.env.DCHAT_LOG_PATH
  if (mockHome && existsSync(mockHome)) {
    rmSync(mockHome, { recursive: true, force: true })
  }
})

describe('GET /api/diagnostics/export', () => {
  it('includes all data sources when available', async () => {
    // Setup backend log
    const logPath = join(mockHome, 'backend.log')
    writeFileSync(logPath, 'backend log content')
    process.env.DCHAT_LOG_PATH = logPath

    // Setup crash reports
    const crashDir = join(mockHome, '.dchat', 'crash-reports')
    mkdirSync(crashDir, { recursive: true })
    writeFileSync(join(crashDir, 'error-2026-01-01.txt'), 'crash report content')

    // Setup MCP logs
    mockMcpService.getServerStatuses.mockResolvedValue([
      { config: { id: 'srv1', name: 'test-server' }, status: 'running', tools: [] },
    ])
    mockMcpService.getServerLogs.mockReturnValue(['mcp log line 1', 'mcp log line 2'])

    const res = await fetch(`${baseUrl}/api/diagnostics/export`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/zip')

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    expect(entries).toContain(`${prefix}/backend.log`)
    expect(entries).toContain(`${prefix}/crash-reports/error-2026-01-01.txt`)
    expect(entries).toContain(`${prefix}/mcp-logs/test-server.log`)

    // Verify content
    expect(zip.readAsText(`${prefix}/backend.log`)).toBe('backend log content')
    expect(zip.readAsText(`${prefix}/crash-reports/error-2026-01-01.txt`)).toBe('crash report content')
    expect(zip.readAsText(`${prefix}/mcp-logs/test-server.log`)).toBe('mcp log line 1\nmcp log line 2')
  })

  it('returns valid zip without backend.log when DCHAT_LOG_PATH is not set', async () => {
    // No DCHAT_LOG_PATH set
    mockMcpService.getServerStatuses.mockResolvedValue([])

    const res = await fetch(`${baseUrl}/api/diagnostics/export`)
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('backend.log'))).toBe(false)
  })

  it('returns valid zip when crash-reports directory does not exist', async () => {
    // mockHome has no .dchat/crash-reports
    mockMcpService.getServerStatuses.mockResolvedValue([])

    const res = await fetch(`${baseUrl}/api/diagnostics/export`)
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('crash-reports'))).toBe(false)
  })

  it('returns valid zip without mcp-logs when no servers exist', async () => {
    mockMcpService.getServerStatuses.mockResolvedValue([])

    const res = await fetch(`${baseUrl}/api/diagnostics/export`)
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('mcp-logs'))).toBe(false)
  })

  it('returns 200 even when MCP service throws', async () => {
    mockMcpService.getServerStatuses.mockRejectedValue(new Error('MCP service error'))

    const res = await fetch(`${baseUrl}/api/diagnostics/export`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/zip')
  })
})
