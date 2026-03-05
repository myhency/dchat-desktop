import { describe, it, expect, afterEach } from 'vitest'
import { rotateLogIfNeeded } from '../log-rotation'
import { join } from 'path'
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'

describe('rotateLogIfNeeded', () => {
  let tempDir: string | undefined

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  async function createFile(path: string, sizeBytes: number, marker?: string): Promise<void> {
    if (marker) {
      // Write marker at start, pad to sizeBytes
      const buf = Buffer.alloc(Math.max(sizeBytes, marker.length), '\0')
      buf.write(marker)
      await writeFile(path, buf)
    } else {
      await writeFile(path, Buffer.alloc(sizeBytes, 'x'))
    }
  }

  async function readMarker(path: string): Promise<string> {
    const buf = await readFile(path)
    const nullIdx = buf.indexOf(0)
    return buf.subarray(0, nullIdx === -1 ? buf.length : nullIdx).toString()
  }

  const OVER_5MB = 5 * 1024 * 1024 + 1
  const UNDER_5MB = 5 * 1024 * 1024

  it('does nothing when log file does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'log-rot-'))
    const logPath = join(tempDir, 'dchat-backend.log')

    rotateLogIfNeeded(logPath)

    expect(existsSync(logPath)).toBe(false)
  })

  it('does nothing when log file is under 5MB', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'log-rot-'))
    const logPath = join(tempDir, 'dchat-backend.log')
    await createFile(logPath, UNDER_5MB)

    rotateLogIfNeeded(logPath)

    expect(existsSync(logPath)).toBe(true)
    expect(existsSync(join(tempDir, 'dchat-backend.1.log'))).toBe(false)
  })

  it('rotates current log to .1.log when over 5MB', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'log-rot-'))
    const logPath = join(tempDir, 'dchat-backend.log')
    await createFile(logPath, OVER_5MB, 'current-content')

    rotateLogIfNeeded(logPath)

    expect(existsSync(logPath)).toBe(false)
    const rotated = join(tempDir, 'dchat-backend.1.log')
    expect(existsSync(rotated)).toBe(true)
    expect(await readMarker(rotated)).toBe('current-content')
  })

  it('shifts existing .1.log to .2.log when rotating', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'log-rot-'))
    const logPath = join(tempDir, 'dchat-backend.log')
    await createFile(logPath, OVER_5MB, 'current')
    await createFile(join(tempDir, 'dchat-backend.1.log'), 100, 'previous-1')

    rotateLogIfNeeded(logPath)

    expect(existsSync(logPath)).toBe(false)
    expect(await readMarker(join(tempDir, 'dchat-backend.1.log'))).toBe('current')
    expect(await readMarker(join(tempDir, 'dchat-backend.2.log'))).toBe('previous-1')
  })

  it('deletes .2.log when it already exists during rotation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'log-rot-'))
    const logPath = join(tempDir, 'dchat-backend.log')
    await createFile(logPath, OVER_5MB, 'current')
    await createFile(join(tempDir, 'dchat-backend.1.log'), 100, 'previous-1')
    await createFile(join(tempDir, 'dchat-backend.2.log'), 100, 'previous-2')

    rotateLogIfNeeded(logPath)

    expect(existsSync(logPath)).toBe(false)
    expect(await readMarker(join(tempDir, 'dchat-backend.1.log'))).toBe('current')
    expect(await readMarker(join(tempDir, 'dchat-backend.2.log'))).toBe('previous-1')
    // .3.log should never exist (max 3 files total)
    expect(existsSync(join(tempDir, 'dchat-backend.3.log'))).toBe(false)
  })

  it('never creates more than 3 files total', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'log-rot-'))
    const logPath = join(tempDir, 'dchat-backend.log')

    // First rotation
    await createFile(logPath, OVER_5MB, 'run-1')
    rotateLogIfNeeded(logPath)

    // Second rotation
    await createFile(logPath, OVER_5MB, 'run-2')
    rotateLogIfNeeded(logPath)

    // Third rotation
    await createFile(logPath, OVER_5MB, 'run-3')
    rotateLogIfNeeded(logPath)

    expect(existsSync(logPath)).toBe(false)
    expect(await readMarker(join(tempDir, 'dchat-backend.1.log'))).toBe('run-3')
    expect(await readMarker(join(tempDir, 'dchat-backend.2.log'))).toBe('run-2')
    expect(existsSync(join(tempDir, 'dchat-backend.3.log'))).toBe(false)
  })
})
