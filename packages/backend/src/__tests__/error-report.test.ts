/**
 * error-report.routes 단위 테스트
 *
 * POST /api/error-reports → crash-reports 디렉토리에 파일 저장 확인.
 * 임시 디렉토리를 사용하여 테스트 격리.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import type { Server } from 'http'
import { existsSync, readdirSync, readFileSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let mockHome = ''
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, homedir: () => mockHome }
})

// Import after mock setup
const { createErrorReportRoutes } = await import('../adapters/inbound/http/error-report.routes')

let server: Server
let baseUrl: string

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/error-reports', createErrorReportRoutes())

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
  mockHome = mkdtempSync(join(tmpdir(), 'dchat-test-'))
})

afterEach(() => {
  if (mockHome && existsSync(mockHome)) {
    rmSync(mockHome, { recursive: true, force: true })
  }
})

describe('POST /api/error-reports', () => {
  it('saves report file and returns filePath', async () => {
    const report = 'Error: test\nStack: ...'

    const res = await fetch(`${baseUrl}/api/error-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; filePath: string }
    expect(body.ok).toBe(true)
    expect(body.filePath).toContain('crash-reports')
    expect(body.filePath).toMatch(/error-.*\.txt$/)

    // Verify file was created with correct content
    expect(existsSync(body.filePath)).toBe(true)
    expect(readFileSync(body.filePath, 'utf-8')).toBe(report)
  })

  it('creates crash-reports directory if missing', async () => {
    const crashDir = join(mockHome, '.dchat', 'crash-reports')
    expect(existsSync(crashDir)).toBe(false)

    await fetch(`${baseUrl}/api/error-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: 'test' }),
    })

    expect(existsSync(crashDir)).toBe(true)
  })

  it('returns 400 when report is missing', async () => {
    const res = await fetch(`${baseUrl}/api/error-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('report is required')
  })

  it('returns 400 when report is not a string', async () => {
    const res = await fetch(`${baseUrl}/api/error-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: 123 }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('report is required')
  })

  it('generates unique filenames for multiple reports', async () => {
    const send = () =>
      fetch(`${baseUrl}/api/error-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: 'test' }),
      })

    await send()
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10))
    await send()

    const crashDir = join(mockHome, '.dchat', 'crash-reports')
    const files = readdirSync(crashDir)
    expect(files.length).toBe(2)
    expect(files[0]).not.toBe(files[1])
  })
})
