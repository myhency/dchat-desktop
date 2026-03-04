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

const mockSettingsService = {
  get: vi.fn(),
  set: vi.fn(),
  getAll: vi.fn(),
}

const mockGetDbStats = vi.fn()

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/diagnostics', createDiagnosticRoutes({
    mcpService: mockMcpService as any,
    settingsService: mockSettingsService as any,
    getDbStats: mockGetDbStats,
  }))

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
  mockSettingsService.getAll.mockReset()
  mockGetDbStats.mockReset()

  // Default mocks for new sections
  mockSettingsService.getAll.mockResolvedValue({})
  mockGetDbStats.mockReturnValue({ sessions: 0, messages: 0, dbSizeBytes: 0 })
  mockMcpService.getServerStatuses.mockResolvedValue([])
})

afterEach(() => {
  delete process.env.DCHAT_LOG_PATH
  if (mockHome && existsSync(mockHome)) {
    rmSync(mockHome, { recursive: true, force: true })
  }
})

const postExport = (body?: object) =>
  fetch(`${baseUrl}/api/diagnostics/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

describe('POST /api/diagnostics/export', () => {
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

    const res = await postExport()
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

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('backend.log'))).toBe(false)
  })

  it('returns valid zip when crash-reports directory does not exist', async () => {
    // mockHome has no .dchat/crash-reports

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('crash-reports'))).toBe(false)
  })

  it('returns valid zip without mcp-logs when no servers exist', async () => {
    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('mcp-logs'))).toBe(false)
  })

  it('returns 200 even when MCP service throws', async () => {
    mockMcpService.getServerStatuses.mockRejectedValue(new Error('MCP service error'))

    const res = await postExport()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/zip')
  })

  it('includes frontend.log when frontendLogs provided', async () => {
    const frontendLogs = [
      { timestamp: '2026-03-04T10:00:00.000Z', level: 'log', message: 'app started' },
      { timestamp: '2026-03-04T10:00:01.000Z', level: 'warn', message: 'slow render' },
      { timestamp: '2026-03-04T10:00:02.000Z', level: 'error', message: 'fetch failed' },
    ]

    const res = await postExport({ frontendLogs })
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    expect(entries).toContain(`${prefix}/frontend.log`)

    const content = zip.readAsText(`${prefix}/frontend.log`)
    expect(content).toBe(
      '[2026-03-04T10:00:00.000Z] [LOG] app started\n' +
      '[2026-03-04T10:00:01.000Z] [WARN] slow render\n' +
      '[2026-03-04T10:00:02.000Z] [ERROR] fetch failed'
    )
  })

  it('does not include frontend.log when frontendLogs not provided', async () => {
    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('frontend.log'))).toBe(false)
  })

  it('does not include frontend.log when frontendLogs is empty array', async () => {
    const res = await postExport({ frontendLogs: [] })
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('frontend.log'))).toBe(false)
  })

  // --- New sections ---

  it('includes system-info.json with expected fields', async () => {
    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    const entries = zip.getEntries().map((e) => e.entryName)
    expect(entries).toContain(`${prefix}/system-info.json`)

    const systemInfo = JSON.parse(zip.readAsText(`${prefix}/system-info.json`))
    expect(systemInfo.node).toHaveProperty('version')
    expect(systemInfo.node).toHaveProperty('platform')
    expect(systemInfo.node).toHaveProperty('arch')
    expect(systemInfo.os).toHaveProperty('release')
    expect(systemInfo.os).toHaveProperty('totalMemory')
    expect(systemInfo.os).toHaveProperty('freeMemory')
    expect(systemInfo.process).toHaveProperty('uptime')
    expect(systemInfo.process).toHaveProperty('memoryUsage')
    expect(systemInfo.process).toHaveProperty('pid')
    expect(systemInfo).toHaveProperty('exportedAt')
  })

  it('includes settings.json with API keys masked', async () => {
    mockSettingsService.getAll.mockResolvedValue({
      anthropic_api_key: 'sk-ant-secret-value',
      openai_api_key: 'sk-openai-secret',
      default_model: 'claude-sonnet-4-5-20250514',
      theme: 'dark',
      some_token: 'bearer-xyz',
      my_password: 'hunter2',
    })

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    const entries = zip.getEntries().map((e) => e.entryName)
    expect(entries).toContain(`${prefix}/settings.json`)

    const settings = JSON.parse(zip.readAsText(`${prefix}/settings.json`))
    expect(settings.anthropic_api_key).toBe('***REDACTED***')
    expect(settings.openai_api_key).toBe('***REDACTED***')
    expect(settings.some_token).toBe('***REDACTED***')
    expect(settings.my_password).toBe('***REDACTED***')
    expect(settings.default_model).toBe('claude-sonnet-4-5-20250514')
    expect(settings.theme).toBe('dark')
  })

  it('includes db-stats.json with expected fields', async () => {
    mockGetDbStats.mockReturnValue({ sessions: 42, messages: 1337, dbSizeBytes: 5242880 })

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    const entries = zip.getEntries().map((e) => e.entryName)
    expect(entries).toContain(`${prefix}/db-stats.json`)

    const dbStats = JSON.parse(zip.readAsText(`${prefix}/db-stats.json`))
    expect(dbStats).toEqual({ sessions: 42, messages: 1337, dbSizeBytes: 5242880 })
  })

  it('includes mcp-config.json without env fields', async () => {
    mockMcpService.getServerStatuses.mockResolvedValue([
      {
        config: { id: 'srv1', name: 'my-mcp', command: 'npx', args: ['-y', 'mcp-server'], env: { SECRET: 'xyz' }, enabled: true },
        status: 'running',
        tools: [{ name: 'tool1' }, { name: 'tool2' }],
      },
    ])
    mockMcpService.getServerLogs.mockReturnValue([])

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const dateStr = new Date().toISOString().slice(0, 10)
    const prefix = `dchat-diagnostics-${dateStr}`

    const entries = zip.getEntries().map((e) => e.entryName)
    expect(entries).toContain(`${prefix}/mcp-config.json`)

    const mcpConfig = JSON.parse(zip.readAsText(`${prefix}/mcp-config.json`))
    expect(mcpConfig).toHaveLength(1)
    expect(mcpConfig[0]).toEqual({
      id: 'srv1',
      name: 'my-mcp',
      command: 'npx',
      args: ['-y', 'mcp-server'],
      enabled: true,
      status: 'running',
      toolCount: 2,
    })
    // env must NOT be present
    expect(mcpConfig[0]).not.toHaveProperty('env')
  })

  it('returns 200 when settings service throws', async () => {
    mockSettingsService.getAll.mockRejectedValue(new Error('settings error'))

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    // settings.json should be missing but other sections still present
    expect(entries.some((e) => e.includes('settings.json'))).toBe(false)
    expect(entries.some((e) => e.includes('system-info.json'))).toBe(true)
  })

  it('returns 200 when getDbStats throws', async () => {
    mockGetDbStats.mockImplementation(() => { throw new Error('db error') })

    const res = await postExport()
    expect(res.status).toBe(200)

    const buffer = Buffer.from(await res.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map((e) => e.entryName)

    expect(entries.some((e) => e.includes('db-stats.json'))).toBe(false)
    expect(entries.some((e) => e.includes('system-info.json'))).toBe(true)
  })
})
