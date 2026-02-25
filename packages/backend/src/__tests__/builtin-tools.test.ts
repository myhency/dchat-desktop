/**
 * Built-in tools 단위 테스트
 *
 * 각 도구 함수, 경로 검증, 확인 흐름, CompositeMcpClientGateway 라우팅 검증.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { ToolConfig } from '../adapters/outbound/builtin-tools/tool-registry'
import { readFileTool } from '../adapters/outbound/builtin-tools/tools/read-file'
import { writeFileTool } from '../adapters/outbound/builtin-tools/tools/write-file'
import { editFileTool } from '../adapters/outbound/builtin-tools/tools/edit-file'
import { listDirectoryTool } from '../adapters/outbound/builtin-tools/tools/list-directory'
import { searchFilesTool } from '../adapters/outbound/builtin-tools/tools/search-files'
import { createDirectoryTool } from '../adapters/outbound/builtin-tools/tools/create-directory'
import { executeCommandTool } from '../adapters/outbound/builtin-tools/tools/execute-command'
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

  describe('read_file', () => {
    it('reads file content', async () => {
      const filePath = path.join(tmpDir, 'test.txt')
      await fs.writeFile(filePath, 'hello world')

      const result = await readFileTool.execute({ path: filePath }, makeConfig())
      expect(result.isError).toBe(false)
      expect(result.content).toBe('hello world')
    })

    it('rejects path outside allowed directories', async () => {
      await expect(readFileTool.execute({ path: '/etc/passwd' }, makeConfig()))
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
    it('replaces unique string', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world foo')

      const result = await editFileTool.execute({ path: filePath, old_string: 'world', new_string: 'earth' }, makeConfig())
      expect(result.isError).toBe(false)

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('hello earth foo')
    })

    it('errors when old_string not found', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world')

      const result = await editFileTool.execute({ path: filePath, old_string: 'nonexistent', new_string: 'x' }, makeConfig())
      expect(result.isError).toBe(true)
      expect(result.content).toContain('not found')
    })

    it('errors when old_string has multiple occurrences', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'aaa bbb aaa')

      const result = await editFileTool.execute({ path: filePath, old_string: 'aaa', new_string: 'x' }, makeConfig())
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
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.every((t) => t.serverId === '__builtin__')).toBe(true)
    // Should not include execute_command when shell disabled
    expect(tools.find((t) => t.name === 'execute_command')).toBeUndefined()
  })

  it('returns no tools when no directories configured', async () => {
    settingsRepo.get = vi.fn(async () => null)
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

    expect(builtInNames.length).toBeGreaterThan(0)
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
