import { describe, it, expect, afterEach } from 'vitest'
import { createLogger } from '../logger'
import { join } from 'path'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { once } from 'events'

describe('createLogger', () => {
  let tempDir: string | undefined

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  it('writes JSON logs to file when logPath is provided', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dchat-log-test-'))
    const logPath = join(tempDir, 'test.log')

    const logger = createLogger(logPath)
    logger.info({ foo: 'bar' }, 'test message')

    // pino transports are async — flush by waiting for the transport stream to finish
    // We need to wait a bit for the async transport to write
    await new Promise((r) => setTimeout(r, 500))

    const content = await readFile(logPath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    expect(lines.length).toBeGreaterThanOrEqual(1)

    const parsed = JSON.parse(lines[lines.length - 1])
    expect(parsed.msg).toBe('test message')
    expect(parsed.foo).toBe('bar')
  })

  it('creates log directory automatically with mkdir: true', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dchat-log-test-'))
    const logPath = join(tempDir, 'nested', 'dir', 'test.log')

    const logger = createLogger(logPath)
    logger.info('nested dir test')

    await new Promise((r) => setTimeout(r, 500))

    const content = await readFile(logPath, 'utf-8')
    expect(content).toContain('nested dir test')
  })

  it('returns a working logger when logPath is not provided', () => {
    const logger = createLogger()
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.fatal).toBe('function')
  })
})
