import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { homedir } from 'os'
import type { McpServerConfig } from '../../../../domain/entities/mcp-server'
import type { McpServerRepository } from '../../../../domain/ports/outbound/mcp-server.repository'

interface McpServerEntry {
  command: string
  args?: string[]
  env?: Record<string, string>
}

interface McpConfigFile {
  mcpServers: Record<string, McpServerEntry>
}

const DEFAULT_MCP_SERVERS: McpConfigFile = {
  mcpServers: {
    fetch: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/fetch-mcp']
    },
    'sequential-thinking': {
      command: 'npx',
      args: ['-y', '@anthropic-ai/sequential-thinking-mcp']
    }
  }
}

export class JsonFileMcpServerRepository implements McpServerRepository {
  private readonly filePath: string

  constructor(filePath?: string) {
    this.filePath = filePath ?? process.env['DCHAT_MCP_CONFIG_PATH'] ?? join(homedir(), '.dchat', 'mcp_config.json')
    this.ensureFile()
  }

  getConfigPath(): string {
    return this.filePath
  }

  async findAll(): Promise<McpServerConfig[]> {
    const config = this.readConfig()
    const mtime = this.getFileMtime()
    return Object.entries(config.mcpServers).map(([name, entry]) =>
      this.toDomain(name, entry, mtime)
    )
  }

  async findById(id: string): Promise<McpServerConfig | null> {
    const config = this.readConfig()
    const entry = config.mcpServers[id]
    if (!entry) return null
    const mtime = this.getFileMtime()
    return this.toDomain(id, entry, mtime)
  }

  async save(serverConfig: McpServerConfig): Promise<void> {
    const config = this.readConfig()
    config.mcpServers[serverConfig.name] = {
      command: serverConfig.command,
      args: serverConfig.args.length > 0 ? serverConfig.args : undefined,
      env: Object.keys(serverConfig.env).length > 0 ? serverConfig.env : undefined
    }
    // If id differs from name (rename case), remove old key
    if (serverConfig.id !== serverConfig.name && config.mcpServers[serverConfig.id]) {
      delete config.mcpServers[serverConfig.id]
    }
    this.writeConfig(config)
  }

  async delete(id: string): Promise<void> {
    const config = this.readConfig()
    delete config.mcpServers[id]
    this.writeConfig(config)
  }

  private ensureFile(): void {
    try {
      readFileSync(this.filePath, 'utf-8')
    } catch {
      mkdirSync(dirname(this.filePath), { recursive: true })
      this.writeConfig(DEFAULT_MCP_SERVERS)
    }
  }

  private readConfig(): McpConfigFile {
    const raw = readFileSync(this.filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<McpConfigFile>
    return { mcpServers: parsed.mcpServers ?? {} }
  }

  private writeConfig(config: McpConfigFile): void {
    writeFileSync(this.filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  private getFileMtime(): Date {
    try {
      return statSync(this.filePath).mtime
    } catch {
      return new Date()
    }
  }

  private toDomain(name: string, entry: McpServerEntry, mtime: Date): McpServerConfig {
    return {
      id: name,
      name,
      command: entry.command,
      args: entry.args ?? [],
      env: entry.env ?? {},
      enabled: true,
      createdAt: mtime,
      updatedAt: mtime
    }
  }
}
