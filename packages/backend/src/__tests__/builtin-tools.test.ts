/**
 * Built-in tools 단위 테스트
 *
 * 각 도구 함수, 경로 검증, 확인 흐름, CompositeMcpClientGateway 라우팅 검증.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger to prevent test output noise and allow log call assertions
vi.mock('../logger', () => {
  const noop = vi.fn()
  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => loggerMock)
  }
  return { default: loggerMock, createLogger: () => loggerMock }
})

import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { ToolConfig } from '../adapters/outbound/builtin-tools/tool-registry'
import { readTextFileTool } from '../adapters/outbound/builtin-tools/tools/read-text-file'
import { writeFileTool } from '../adapters/outbound/builtin-tools/tools/write-file'
import { editFileTool } from '../adapters/outbound/builtin-tools/tools/edit-file'
import { listDirectoryTool } from '../adapters/outbound/builtin-tools/tools/list-directory'
import { searchFilesTool } from '../adapters/outbound/builtin-tools/tools/search-files'
import { createDirectoryTool } from '../adapters/outbound/builtin-tools/tools/create-directory'
import { executeCommandTool } from '../adapters/outbound/builtin-tools/tools/execute-command'
import { readMediaFileTool } from '../adapters/outbound/builtin-tools/tools/read-media-file'
import { readMultipleFilesTool } from '../adapters/outbound/builtin-tools/tools/read-multiple-files'
import { listDirectoryWithSizesTool } from '../adapters/outbound/builtin-tools/tools/list-directory-with-sizes'
import { directoryTreeTool } from '../adapters/outbound/builtin-tools/tools/directory-tree'
import { moveFileTool } from '../adapters/outbound/builtin-tools/tools/move-file'
import { getFileInfoTool } from '../adapters/outbound/builtin-tools/tools/get-file-info'
import { listAllowedDirectoriesTool } from '../adapters/outbound/builtin-tools/tools/list-allowed-directories'
import { BuiltInToolProvider } from '../adapters/outbound/builtin-tools/builtin-tool-provider'
import { CompositeMcpClientGateway } from '../adapters/outbound/builtin-tools/composite-mcp-gateway'
import type { McpClientGateway } from '../domain/ports/outbound/mcp-client.gateway'
import type { SettingsRepository } from '../domain/ports/outbound/settings.repository'

// ── Helpers ──

let tmpDir: string

async function createTmpDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'builtin-tools-test-'))
  return dir
}

function makeConfig(overrides?: Partial<ToolConfig>): ToolConfig {
  return {
    allowedDirectories: [tmpDir],
    shellTimeout: 5000,
    ...overrides
  }
}

// ── Tests ──

describe('Built-in tools', () => {
  beforeEach(async () => {
    tmpDir = await createTmpDir()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('read_text_file', () => {
    it('reads file content', async () => {
      const filePath = path.join(tmpDir, 'test.txt')
      await fs.writeFile(filePath, 'hello world')

      const result = await readTextFileTool.execute({ path: filePath }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toBe('hello world')
    })

    it('reads first N lines with head parameter', async () => {
      const filePath = path.join(tmpDir, 'lines.txt')
      await fs.writeFile(filePath, 'line1\nline2\nline3\nline4\nline5')

      const result = await readTextFileTool.execute({ path: filePath, head: 2 }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toBe('line1\nline2')
    })

    it('reads last N lines with tail parameter', async () => {
      const filePath = path.join(tmpDir, 'lines.txt')
      await fs.writeFile(filePath, 'line1\nline2\nline3\nline4\nline5')

      const result = await readTextFileTool.execute({ path: filePath, tail: 2 }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toBe('line4\nline5')
    })

    it('errors when both head and tail specified', async () => {
      const filePath = path.join(tmpDir, 'lines.txt')
      await fs.writeFile(filePath, 'line1\nline2\nline3')

      const result = await readTextFileTool.execute({ path: filePath, head: 1, tail: 1 }, makeConfig())
      expect(result.isError).toBe(true)
      expect(result.content).toContain('Cannot specify both')
    })

    it('rejects path outside allowed directories', async () => {
      await expect(readTextFileTool.execute({ path: '/etc/passwd' }, makeConfig()))
        .rejects.toThrow('Access denied')
    })
  })

  describe('write_file', () => {
    it('creates a new file', async () => {
      const filePath = path.join(tmpDir, 'new.txt')
      const result = await writeFileTool.execute({ path: filePath, content: 'new content' }, makeConfig())
      expect(result.isError).toBe(false)

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('new content')
    })

    it('rejects path outside allowed directories', async () => {
      await expect(writeFileTool.execute({ path: '/usr/local/hacked.txt', content: 'x' }, makeConfig()))
        .rejects.toThrow('Access denied')
    })
  })

  describe('edit_file', () => {
    it('applies single edit and returns diff', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world foo')

      const result = await editFileTool.execute({
        path: filePath,
        edits: [{ oldText: 'world', newText: 'earth' }]
      }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('-')
      expect(result.content).toContain('+')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('hello earth foo')
    })

    it('applies multiple edits sequentially', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world foo')

      const result = await editFileTool.execute({
        path: filePath,
        edits: [
          { oldText: 'world', newText: 'earth' },
          { oldText: 'foo', newText: 'bar' }
        ]
      }, makeConfig())
      expect(result.isError).toBe(false)

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('hello earth bar')
    })

    it('returns diff without modifying file in dryRun mode', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world foo')

      const result = await editFileTool.execute({
        path: filePath,
        edits: [{ oldText: 'world', newText: 'earth' }],
        dryRun: true
      }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('dry run')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('hello world foo')
    })

    it('errors when oldText not found', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world')

      const result = await editFileTool.execute({
        path: filePath,
        edits: [{ oldText: 'nonexistent', newText: 'x' }]
      }, makeConfig())
      expect(result.isError).toBe(true)
      expect(result.content).toContain('not found')
    })

    it('errors when oldText has multiple occurrences', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'aaa bbb aaa')

      const result = await editFileTool.execute({
        path: filePath,
        edits: [{ oldText: 'aaa', newText: 'x' }]
      }, makeConfig())
      expect(result.isError).toBe(true)
      expect(result.content).toContain('2 times')
    })
  })

  describe('list_directory', () => {
    it('lists directory contents', async () => {
      await fs.writeFile(path.join(tmpDir, 'a.txt'), '')
      await fs.mkdir(path.join(tmpDir, 'sub'))

      const result = await listDirectoryTool.execute({ path: tmpDir }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('[FILE] a.txt')
      expect(result.content).toContain('[DIR] sub')
    })
  })

  describe('search_files', () => {
    it('finds files matching pattern', async () => {
      await fs.writeFile(path.join(tmpDir, 'hello.txt'), '')
      await fs.mkdir(path.join(tmpDir, 'sub'))
      await fs.writeFile(path.join(tmpDir, 'sub', 'hello.js'), '')

      const result = await searchFilesTool.execute({ path: tmpDir, pattern: 'hello' }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('hello.txt')
      expect(result.content).toContain('hello.js')
    })

    it('returns message when no matches', async () => {
      const result = await searchFilesTool.execute({ path: tmpDir, pattern: 'nonexistent' }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('No files matching')
    })

    it('excludes files matching excludePatterns', async () => {
      await fs.writeFile(path.join(tmpDir, 'hello.txt'), '')
      await fs.writeFile(path.join(tmpDir, 'hello.log'), '')

      const result = await searchFilesTool.execute({
        path: tmpDir,
        pattern: 'hello',
        excludePatterns: ['*.log']
      }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('hello.txt')
      expect(result.content).not.toContain('hello.log')
    })
  })

  describe('create_directory', () => {
    it('creates directory recursively', async () => {
      const dirPath = path.join(tmpDir, 'a', 'b', 'c')
      const result = await createDirectoryTool.execute({ path: dirPath }, makeConfig())
      expect(result.isError).toBe(false)

      const stat = await fs.stat(dirPath)
      expect(stat.isDirectory()).toBe(true)
    })
  })

  describe('execute_command', () => {
    it('executes a command and returns output', async () => {
      const result = await executeCommandTool.execute({ command: 'echo', args: ['hello'] }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content.trim()).toBe('hello')
    })

    it('returns error for failing command', async () => {
      const result = await executeCommandTool.execute({ command: 'false' }, makeConfig())
      expect(result.isError).toBe(true)
    })
  })

  describe('read_media_file', () => {
    it('reads image file as base64', async () => {
      const filePath = path.join(tmpDir, 'test.png')
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG header
      await fs.writeFile(filePath, buffer)

      const result = await readMediaFileTool.execute({ path: filePath }, makeConfig())
      expect(result.isError).toBe(false)
      const parsed = JSON.parse(result.content)
      expect(parsed.mimeType).toBe('image/png')
      expect(parsed.base64Data).toBe(buffer.toString('base64'))
    })

    it('rejects unsupported file type', async () => {
      const filePath = path.join(tmpDir, 'test.xyz')
      await fs.writeFile(filePath, 'data')

      const result = await readMediaFileTool.execute({ path: filePath }, makeConfig())
      expect(result.isError).toBe(true)
      expect(result.content).toContain('Unsupported media type')
    })
  })

  describe('read_multiple_files', () => {
    it('reads multiple files', async () => {
      const file1 = path.join(tmpDir, 'a.txt')
      const file2 = path.join(tmpDir, 'b.txt')
      await fs.writeFile(file1, 'content A')
      await fs.writeFile(file2, 'content B')

      const result = await readMultipleFilesTool.execute({ paths: [file1, file2] }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('content A')
      expect(result.content).toContain('content B')
    })

    it('includes error for missing files', async () => {
      const file1 = path.join(tmpDir, 'exists.txt')
      const file2 = path.join(tmpDir, 'missing.txt')
      await fs.writeFile(file1, 'ok')

      const result = await readMultipleFilesTool.execute({ paths: [file1, file2] }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('ok')
      expect(result.content).toContain('Error:')
    })
  })

  describe('list_directory_with_sizes', () => {
    it('lists files with sizes and summary', async () => {
      await fs.writeFile(path.join(tmpDir, 'small.txt'), 'hi')
      await fs.mkdir(path.join(tmpDir, 'sub'))

      const result = await listDirectoryWithSizesTool.execute({ path: tmpDir }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('[FILE] small.txt')
      expect(result.content).toContain('[DIR] sub/')
      expect(result.content).toContain('file(s)')
      expect(result.content).toContain('directory(ies)')
    })

    it('sorts by size', async () => {
      await fs.writeFile(path.join(tmpDir, 'big.txt'), 'a'.repeat(1000))
      await fs.writeFile(path.join(tmpDir, 'small.txt'), 'hi')

      const result = await listDirectoryWithSizesTool.execute({ path: tmpDir, sortBy: 'size' }, makeConfig())
      expect(result.isError).toBe(false)
      const lines = result.content.split('\n')
      expect(lines[0]).toContain('big.txt')
    })
  })

  describe('directory_tree', () => {
    it('returns JSON tree structure', async () => {
      await fs.mkdir(path.join(tmpDir, 'sub'))
      await fs.writeFile(path.join(tmpDir, 'sub', 'file.txt'), '')
      await fs.writeFile(path.join(tmpDir, 'root.txt'), '')

      const result = await directoryTreeTool.execute({ path: tmpDir }, makeConfig())
      expect(result.isError).toBe(false)
      const tree = JSON.parse(result.content)
      expect(tree.type).toBe('directory')
      expect(tree.children).toBeDefined()
      expect(tree.children.length).toBeGreaterThan(0)
    })

    it('excludes patterns', async () => {
      await fs.writeFile(path.join(tmpDir, 'keep.txt'), '')
      await fs.writeFile(path.join(tmpDir, 'skip.log'), '')

      const result = await directoryTreeTool.execute({
        path: tmpDir,
        excludePatterns: ['*.log']
      }, makeConfig())
      const tree = JSON.parse(result.content)
      const names = tree.children.map((c: { name: string }) => c.name)
      expect(names).toContain('keep.txt')
      expect(names).not.toContain('skip.log')
    })
  })

  describe('move_file', () => {
    it('moves a file', async () => {
      const src = path.join(tmpDir, 'source.txt')
      const dst = path.join(tmpDir, 'dest.txt')
      await fs.writeFile(src, 'data')

      const result = await moveFileTool.execute({ source: src, destination: dst }, makeConfig())
      expect(result.isError).toBe(false)

      await expect(fs.access(src)).rejects.toThrow()
      const content = await fs.readFile(dst, 'utf-8')
      expect(content).toBe('data')
    })

    it('rejects move to outside allowed directories', async () => {
      const src = path.join(tmpDir, 'source.txt')
      await fs.writeFile(src, 'data')

      await expect(moveFileTool.execute({ source: src, destination: '/tmp/hacked.txt' }, makeConfig()))
        .rejects.toThrow('Access denied')
    })
  })

  describe('get_file_info', () => {
    it('returns file metadata', async () => {
      const filePath = path.join(tmpDir, 'info.txt')
      await fs.writeFile(filePath, 'hello')

      const result = await getFileInfoTool.execute({ path: filePath }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('Name: info.txt')
      expect(result.content).toContain('Type: file')
      expect(result.content).toContain('Size: 5')
      expect(result.content).toContain('Permissions:')
    })

    it('returns directory metadata', async () => {
      const result = await getFileInfoTool.execute({ path: tmpDir }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('Type: directory')
    })
  })

  describe('list_allowed_directories', () => {
    it('returns allowed directories', async () => {
      const result = await listAllowedDirectoriesTool.execute({}, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toContain('Allowed directories:')
      expect(result.content).toContain(tmpDir)
    })

    it('handles empty directories', async () => {
      const result = await listAllowedDirectoriesTool.execute({}, makeConfig({ allowedDirectories: [] }))
      expect(result.isError).toBe(false)
      expect(result.content).toContain('No allowed directories')
    })
  })
})

describe('BuiltInToolProvider', () => {
  let settingsRepo: SettingsRepository
  let provider: BuiltInToolProvider
  let providerDir: string

  beforeEach(async () => {
    providerDir = await createTmpDir()
    const settings: Record<string, string> = {
      builtin_tools_allowed_dirs: JSON.stringify([providerDir]),
      builtin_tools_shell_enabled: 'false'
    }

    settingsRepo = {
      get: vi.fn(async (key: string) => settings[key] ?? null),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => settings),
      deleteAll: vi.fn(async () => {})
    }

    provider = new BuiltInToolProvider(settingsRepo)
  })

  afterEach(async () => {
    await fs.rm(providerDir, { recursive: true, force: true })
  })

  it('returns filesystem tools when directories are configured', async () => {
    const tools = await provider.getTools()
    expect(tools.length).toBe(14)
    expect(tools.every((t) => t.serverId === '__builtin__')).toBe(true)
    // Should not include execute_command when shell disabled
    expect(tools.find((t) => t.name === 'execute_command')).toBeUndefined()
  })

  it('returns default tools (/tmp + shell) when no settings configured', async () => {
    settingsRepo.get = vi.fn(async () => null)
    const tools = await provider.getTools()
    // 14 filesystem + 1 shell (execute_command)
    expect(tools.length).toBe(15)
    expect(tools.find((t) => t.name === 'execute_command')).toBeDefined()
  })

  it('returns no tools when directories explicitly set to empty', async () => {
    settingsRepo.get = vi.fn(async (key: string) => {
      if (key === 'builtin_tools_allowed_dirs') return '[]'
      return null
    })
    const tools = await provider.getTools()
    expect(tools.length).toBe(0)
  })

  it('includes shell tool when shell enabled', async () => {
    settingsRepo.get = vi.fn(async (key: string) => {
      if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
      if (key === 'builtin_tools_shell_enabled') return 'true'
      return null
    })

    const tools = await provider.getTools()
    expect(tools.find((t) => t.name === 'execute_command')).toBeDefined()
  })

  it('calls confirmFn for dangerous tools', async () => {
    const confirmFn = vi.fn(async () => true)
    provider.setConfirmationHandler(confirmFn)

    const filePath = path.join(providerDir, 'test.txt')
    await provider.callTool('write_file', { path: filePath, content: 'hi' }, 'tool-1')
    expect(confirmFn).toHaveBeenCalledWith('tool-1', 'write_file', { path: filePath, content: 'hi' })
  })

  it('returns denial message when user denies', async () => {
    provider.setConfirmationHandler(async () => false)

    const filePath = path.join(providerDir, 'test.txt')
    const result = await provider.callTool('write_file', { path: filePath, content: 'hi' }, 'tool-1')
    expect(result.isError).toBe(true)
    expect(result.content).toContain('denied')
  })

  it('does not call confirmFn for safe tools', async () => {
    const confirmFn = vi.fn(async () => true)
    provider.setConfirmationHandler(confirmFn)

    await provider.callTool('list_directory', { path: providerDir }, 'tool-2')
    expect(confirmFn).not.toHaveBeenCalled()
  })

  describe('tool permissions', () => {
    it('excludes blocked tools from getTools()', async () => {
      const perms = { read_text_file: 'blocked' }
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
        if (key === 'builtin_tools_permissions') return JSON.stringify(perms)
        return null
      })

      const tools = await provider.getTools()
      expect(tools.find((t) => t.name === 'read_text_file')).toBeUndefined()
      expect(tools.find((t) => t.name === 'list_directory')).toBeDefined()
    })

    it('skips confirmFn when permission is always (even for dangerous tools)', async () => {
      const perms = { write_file: 'always' }
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
        if (key === 'builtin_tools_permissions') return JSON.stringify(perms)
        return null
      })

      const confirmFn = vi.fn(async () => true)
      provider.setConfirmationHandler(confirmFn)

      const filePath = path.join(providerDir, 'always-test.txt')
      await provider.callTool('write_file', { path: filePath, content: 'hi' }, 'tool-3')
      expect(confirmFn).not.toHaveBeenCalled()
    })

    it('calls confirmFn when permission is confirm (even for safe tools)', async () => {
      const perms = { list_directory: 'confirm' }
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
        if (key === 'builtin_tools_permissions') return JSON.stringify(perms)
        return null
      })

      const confirmFn = vi.fn(async () => true)
      provider.setConfirmationHandler(confirmFn)

      await provider.callTool('list_directory', { path: providerDir }, 'tool-4')
      expect(confirmFn).toHaveBeenCalledWith('tool-4', 'list_directory', { path: providerDir })
    })

    it('returns error when calling a blocked tool', async () => {
      const perms = { read_text_file: 'blocked' }
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
        if (key === 'builtin_tools_permissions') return JSON.stringify(perms)
        return null
      })

      const result = await provider.callTool('read_text_file', { path: '/any' }, 'tool-5')
      expect(result.isError).toBe(true)
      expect(result.content).toContain('not found')
    })

    it('falls back to isDangerous-based default when no permission set', async () => {
      // No permissions set — write_file (isDangerous=true) should trigger confirm
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
        return null
      })

      const confirmFn = vi.fn(async () => true)
      provider.setConfirmationHandler(confirmFn)

      const filePath = path.join(providerDir, 'default-test.txt')
      await provider.callTool('write_file', { path: filePath, content: 'hi' }, 'tool-6')
      expect(confirmFn).toHaveBeenCalled()

      // list_directory (isDangerous=false) should NOT trigger confirm
      confirmFn.mockClear()
      await provider.callTool('list_directory', { path: providerDir }, 'tool-7')
      expect(confirmFn).not.toHaveBeenCalled()
    })
  })

  describe('tool call logging', () => {
    let loggerMock: any

    beforeEach(async () => {
      loggerMock = (await import('../logger')).default
      vi.clearAllMocks()
    })

    it('logs warning when tool not found', async () => {
      const result = await provider.callTool('nonexistent_tool', {}, 'tool-log-1')
      expect(result.isError).toBe(true)
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'nonexistent_tool', toolUseId: 'tool-log-1' }),
        'Built-in tool not found'
      )
    })

    it('logs info when tool is blocked', async () => {
      const perms = { read_text_file: 'blocked' }
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([providerDir])
        if (key === 'builtin_tools_permissions') return JSON.stringify(perms)
        return null
      })

      const result = await provider.callTool('read_text_file', { path: '/any' }, 'tool-log-2')
      // blocked tool is filtered from getActiveTools, so it's "not found"
      expect(result.isError).toBe(true)
    })

    it('logs debug for tool execution lifecycle', async () => {
      const filePath = path.join(providerDir, 'log-test.txt')
      await fs.writeFile(filePath, 'content')

      await provider.callTool('read_text_file', { path: filePath }, 'tool-log-3')
      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'read_text_file', toolUseId: 'tool-log-3' }),
        'Executing built-in tool'
      )
      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'read_text_file', toolUseId: 'tool-log-3', isError: false }),
        'Built-in tool completed'
      )
    })

    it('logs denial when user rejects confirmation', async () => {
      provider.setConfirmationHandler(async () => false)

      const filePath = path.join(providerDir, 'denied.txt')
      await provider.callTool('write_file', { path: filePath, content: 'hi' }, 'tool-log-4')
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'write_file', toolUseId: 'tool-log-4' }),
        'Tool denied by user'
      )
    })
  })

  describe('getStatus', () => {
    it('returns running with /tmp when no settings configured', async () => {
      settingsRepo.get = vi.fn(async () => null)
      const status = await provider.getStatus()
      expect(status.status).toBe('running')
      expect(status.toolCount).toBe(15)
      expect(status.directories).toEqual(['/tmp'])
      expect(status.errors).toEqual([])
    })

    it('returns disabled when directories explicitly set to empty', async () => {
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return '[]'
        return null
      })
      const status = await provider.getStatus()
      expect(status.status).toBe('disabled')
      expect(status.toolCount).toBe(0)
      expect(status.directories).toEqual([])
      expect(status.errors).toEqual([])
    })

    it('returns running when directories are accessible', async () => {
      const status = await provider.getStatus()
      expect(status.status).toBe('running')
      expect(status.toolCount).toBe(14)
      expect(status.directories).toEqual([providerDir])
      expect(status.errors).toEqual([])
    })

    it('returns error when directories are inaccessible', async () => {
      const badDir = '/nonexistent/path/that/does/not/exist'
      settingsRepo.get = vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([badDir])
        if (key === 'builtin_tools_shell_enabled') return 'false'
        return null
      })

      const status = await provider.getStatus()
      expect(status.status).toBe('error')
      expect(status.directories).toEqual([badDir])
      expect(status.errors).toEqual([badDir])
    })
  })

  describe('alwaysAllow flow', () => {
    it('skips confirmFn after permission is changed to always', async () => {
      const settings: Record<string, string> = {
        builtin_tools_allowed_dirs: JSON.stringify([providerDir]),
        builtin_tools_shell_enabled: 'false'
      }
      settingsRepo.get = vi.fn(async (key: string) => settings[key] ?? null)
      settingsRepo.set = vi.fn(async (key: string, value: string) => {
        settings[key] = value
      })

      // First call: confirmFn should be called (write_file is dangerous, no permission set)
      const confirmFn = vi.fn(async () => true)
      provider.setConfirmationHandler(confirmFn)

      const filePath = path.join(providerDir, 'always-test.txt')
      await provider.callTool('write_file', { path: filePath, content: 'hi' }, 'tool-a1')
      expect(confirmFn).toHaveBeenCalled()

      // Simulate alwaysAllow: save permission as 'always'
      const perms = { write_file: 'always' }
      await settingsRepo.set('builtin_tools_permissions', JSON.stringify(perms))

      // Second call: confirmFn should NOT be called
      confirmFn.mockClear()
      const filePath2 = path.join(providerDir, 'always-test2.txt')
      await provider.callTool('write_file', { path: filePath2, content: 'hi2' }, 'tool-a2')
      expect(confirmFn).not.toHaveBeenCalled()
    })
  })
})

describe('CompositeMcpClientGateway', () => {
  let builtIn: BuiltInToolProvider
  let external: McpClientGateway
  let gateway: CompositeMcpClientGateway
  let compositeDir: string

  beforeEach(async () => {
    compositeDir = await createTmpDir()
    const settingsRepo: SettingsRepository = {
      get: vi.fn(async (key: string) => {
        if (key === 'builtin_tools_allowed_dirs') return JSON.stringify([compositeDir])
        if (key === 'builtin_tools_shell_enabled') return 'false'
        return null
      }),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => ({})),
      deleteAll: vi.fn(async () => {})
    }

    builtIn = new BuiltInToolProvider(settingsRepo)

    external = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'stopped' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => [{ name: 'ext_tool', description: 'ext', inputSchema: {}, serverId: 'ext-1' }]),
      callTool: vi.fn(async () => ({ content: 'ext result', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    gateway = new CompositeMcpClientGateway(builtIn, external)
  })

  it('getAllTools combines built-in and external tools', async () => {
    const tools = await gateway.getAllTools()
    const builtInNames = tools.filter((t) => t.serverId === '__builtin__').map((t) => t.name)
    const extNames = tools.filter((t) => t.serverId === 'ext-1').map((t) => t.name)

    expect(builtInNames.length).toBe(14)
    expect(extNames).toContain('ext_tool')
  })

  afterEach(async () => {
    await fs.rm(compositeDir, { recursive: true, force: true })
  })

  it('routes callTool to built-in for __builtin__ serverId', async () => {
    // list_directory is safe — no confirm needed
    const result = await gateway.callTool('__builtin__', 'list_directory', { path: compositeDir })
    expect(result.isError).toBe(false)
    expect(external.callTool).not.toHaveBeenCalled()
  })

  it('routes callTool to external for other serverIds', async () => {
    const result = await gateway.callTool('ext-1', 'ext_tool', { arg: 'value' })
    expect(result.content).toBe('ext result')
    expect(external.callTool).toHaveBeenCalledWith('ext-1', 'ext_tool', { arg: 'value' })
  })

  it('getServerStatus returns running for __builtin__', () => {
    expect(gateway.getServerStatus('__builtin__')).toBe('running')
  })

  it('delegates server lifecycle to external', async () => {
    await gateway.startServer('s1', 'cmd', [], {})
    expect(external.startServer).toHaveBeenCalled()

    await gateway.stopServer('s1')
    expect(external.stopServer).toHaveBeenCalled()

    await gateway.shutdownAll()
    expect(external.shutdownAll).toHaveBeenCalled()
  })
})
