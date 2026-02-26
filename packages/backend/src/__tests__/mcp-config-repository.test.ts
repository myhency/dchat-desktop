/**
 * JsonFileMcpServerRepository 단위 테스트
 *
 * - 파일 미존재 시 기본 MCP 서버(fetch, sequential-thinking) 포함 config 생성
 * - 파일이 이미 존재하면 덮어쓰지 않음
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { JsonFileMcpServerRepository } from '../adapters/outbound/persistence/json/mcp-config.repository'

function createTmpDir(): string {
  const dir = join(tmpdir(), `dchat-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('JsonFileMcpServerRepository', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTmpDir()
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('파일 미존재 시 기본 서버가 포함된 config 생성', () => {
    const filePath = join(tmpDir, 'mcp_config.json')

    new JsonFileMcpServerRepository(filePath)

    const raw = readFileSync(filePath, 'utf-8')
    const config = JSON.parse(raw)

    expect(config.mcpServers).toBeDefined()
    expect(config.mcpServers.fetch).toEqual({
      command: 'npx',
      args: ['-y', '@anthropic-ai/fetch-mcp']
    })
    expect(config.mcpServers['sequential-thinking']).toEqual({
      command: 'npx',
      args: ['-y', '@anthropic-ai/sequential-thinking-mcp']
    })
  })

  it('파일이 이미 존재하면 덮어쓰지 않음', () => {
    const filePath = join(tmpDir, 'mcp_config.json')
    const existingConfig = {
      mcpServers: {
        'my-server': {
          command: 'node',
          args: ['server.js']
        }
      }
    }
    writeFileSync(filePath, JSON.stringify(existingConfig, null, 2) + '\n', 'utf-8')

    new JsonFileMcpServerRepository(filePath)

    const raw = readFileSync(filePath, 'utf-8')
    const config = JSON.parse(raw)

    expect(config.mcpServers['my-server']).toEqual({
      command: 'node',
      args: ['server.js']
    })
    expect(config.mcpServers.fetch).toBeUndefined()
    expect(config.mcpServers['sequential-thinking']).toBeUndefined()
  })

  it('findAll로 기본 서버 조회 가능', async () => {
    const filePath = join(tmpDir, 'mcp_config.json')

    const repo = new JsonFileMcpServerRepository(filePath)
    const servers = await repo.findAll()

    expect(servers).toHaveLength(2)
    const names = servers.map((s) => s.name)
    expect(names).toContain('fetch')
    expect(names).toContain('sequential-thinking')
  })
})
