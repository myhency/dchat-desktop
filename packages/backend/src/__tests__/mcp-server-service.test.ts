/**
 * L2. McpServerService 단위 테스트 — mock ports
 *
 * MCP 서버 CRUD, 시작/중지, 상태 조회, enabled 서버만 시작 검증.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServerService } from '../domain/services/mcp-server.service'
import type { McpServerConfig } from '../domain/entities/mcp-server'
import type { McpServerRepository } from '../domain/ports/outbound/mcp-server.repository'
import type { McpClientGateway } from '../domain/ports/outbound/mcp-client.gateway'

// ── Helpers ──

function createMockConfig(overrides?: Partial<McpServerConfig>): McpServerConfig {
  return {
    id: 'srv-1',
    name: 'Test Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    env: {},
    enabled: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides
  }
}

// ── Tests ──

describe('McpServerService', () => {
  let repo: McpServerRepository
  let client: McpClientGateway
  let service: McpServerService

  let savedConfigs: McpServerConfig[]

  beforeEach(() => {
    savedConfigs = []

    repo = {
      findAll: vi.fn(async () => savedConfigs),
      findById: vi.fn(async (id: string) => savedConfigs.find((c) => c.id === id) ?? null),
      save: vi.fn(async (config: McpServerConfig) => {
        const idx = savedConfigs.findIndex((c) => c.id === config.id)
        if (idx >= 0) savedConfigs[idx] = config
        else savedConfigs.push(config)
      }),
      delete: vi.fn(async (id: string) => {
        savedConfigs = savedConfigs.filter((c) => c.id !== id)
      }),
      getConfigPath: vi.fn(() => '/home/user/.dchat/mcp_config.json')
    }

    client = {
      startServer: vi.fn(async () => {}),
      stopServer: vi.fn(async () => {}),
      getServerStatus: vi.fn(() => 'stopped' as const),
      getServerTools: vi.fn(() => []),
      getAllTools: vi.fn(() => []),
      callTool: vi.fn(async () => ({ content: '', isError: false })),
      getServerLogs: vi.fn(() => []),
      shutdownAll: vi.fn(async () => {})
    }

    service = new McpServerService(repo, client)
  })

  describe('createServer', () => {
    it('생성 후 저장 및 자동 시작', async () => {
      const result = await service.createServer('FS Server', 'npx', ['-y', 'server'], {})

      expect(result.name).toBe('FS Server')
      expect(result.command).toBe('npx')
      expect(result.args).toEqual(['-y', 'server'])
      expect(result.enabled).toBe(true)
      expect(repo.save).toHaveBeenCalledTimes(1)
      expect(client.startServer).toHaveBeenCalledWith(result.id, 'npx', ['-y', 'server'], {})
    })

    it('시작 실패해도 서버 설정은 저장됨', async () => {
      ;(client.startServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('start failed'))

      const result = await service.createServer('FS Server', 'npx', [], {})

      expect(result.name).toBe('FS Server')
      expect(repo.save).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateServer', () => {
    it('이름만 변경 시 재시작 안 함', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)

      const result = await service.updateServer('srv-1', { name: 'Renamed' })

      expect(result.name).toBe('Renamed')
      expect(client.stopServer).not.toHaveBeenCalled()
      expect(client.startServer).not.toHaveBeenCalled()
    })

    it('command 변경 시 재시작', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)

      await service.updateServer('srv-1', { command: 'node' })

      expect(client.stopServer).toHaveBeenCalledWith('srv-1')
      expect(client.startServer).toHaveBeenCalledWith('srv-1', 'node', config.args, config.env)
    })

    it('args 변경 시 재시작', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)

      await service.updateServer('srv-1', { args: ['--new'] })

      expect(client.stopServer).toHaveBeenCalledWith('srv-1')
      expect(client.startServer).toHaveBeenCalledWith('srv-1', config.command, ['--new'], config.env)
    })

    it('존재하지 않는 서버 업데이트 시 Error', async () => {
      await expect(service.updateServer('nonexistent', { name: 'x' }))
        .rejects.toThrow('MCP server not found: nonexistent')
    })
  })

  describe('deleteServer', () => {
    it('중지 후 삭제', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)

      await service.deleteServer('srv-1')

      expect(client.stopServer).toHaveBeenCalledWith('srv-1')
      expect(repo.delete).toHaveBeenCalledWith('srv-1')
    })

    it('중지 실패해도 삭제됨', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)
      ;(client.stopServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('stop failed'))

      await service.deleteServer('srv-1')

      expect(repo.delete).toHaveBeenCalledWith('srv-1')
    })
  })

  describe('startServer / stopServer', () => {
    it('startServer: 설정 조회 후 client.startServer 호출', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)

      await service.startServer('srv-1')

      expect(client.startServer).toHaveBeenCalledWith('srv-1', config.command, config.args, config.env)
    })

    it('startServer: 존재하지 않으면 Error', async () => {
      await expect(service.startServer('nonexistent'))
        .rejects.toThrow('MCP server not found: nonexistent')
    })

    it('stopServer: client.stopServer 호출', async () => {
      await service.stopServer('srv-1')

      expect(client.stopServer).toHaveBeenCalledWith('srv-1')
    })
  })

  describe('restartServer', () => {
    it('중지 후 시작', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)

      await service.restartServer('srv-1')

      expect(client.stopServer).toHaveBeenCalledWith('srv-1')
      expect(client.startServer).toHaveBeenCalledWith('srv-1', config.command, config.args, config.env)
    })
  })

  describe('getServerStatuses', () => {
    it('모든 서버의 상태와 도구 반환', async () => {
      const config = createMockConfig()
      savedConfigs.push(config)
      ;(client.getServerStatus as ReturnType<typeof vi.fn>).mockReturnValue('running')
      ;(client.getServerTools as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: 'list_files', description: 'List files', inputSchema: {}, serverId: 'srv-1' }
      ])

      const statuses = await service.getServerStatuses()

      expect(statuses).toHaveLength(1)
      expect(statuses[0].config.id).toBe('srv-1')
      expect(statuses[0].status).toBe('running')
      expect(statuses[0].tools).toHaveLength(1)
    })
  })

  describe('startEnabledServers', () => {
    it('enabled 서버만 시작', async () => {
      savedConfigs.push(createMockConfig({ id: 'srv-1', enabled: true }))
      savedConfigs.push(createMockConfig({ id: 'srv-2', enabled: false }))
      savedConfigs.push(createMockConfig({ id: 'srv-3', enabled: true }))

      await service.startEnabledServers()

      expect(client.startServer).toHaveBeenCalledTimes(2)
      const calls = (client.startServer as ReturnType<typeof vi.fn>).mock.calls
      expect(calls[0][0]).toBe('srv-1')
      expect(calls[1][0]).toBe('srv-3')
    })

    it('한 서버 시작 실패해도 나머지 계속 시작', async () => {
      savedConfigs.push(createMockConfig({ id: 'srv-1', enabled: true }))
      savedConfigs.push(createMockConfig({ id: 'srv-2', enabled: true }))

      ;(client.startServer as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined)

      await service.startEnabledServers()

      expect(client.startServer).toHaveBeenCalledTimes(2)
    })
  })

  describe('getConfigPath', () => {
    it('리포지토리의 설정 파일 경로를 반환', () => {
      const path = service.getConfigPath()

      expect(path).toBe('/home/user/.dchat/mcp_config.json')
      expect(repo.getConfigPath).toHaveBeenCalled()
    })
  })

  describe('reloadConfig', () => {
    it('모든 서버 종료 후 enabled 서버 재시작', async () => {
      savedConfigs.push(createMockConfig({ id: 'srv-1', enabled: true }))
      savedConfigs.push(createMockConfig({ id: 'srv-2', enabled: false }))

      await service.reloadConfig()

      expect(client.shutdownAll).toHaveBeenCalledTimes(1)
      expect(client.startServer).toHaveBeenCalledTimes(1)
      expect((client.startServer as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('srv-1')
    })
  })
})
