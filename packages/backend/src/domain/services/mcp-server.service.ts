import type { McpServerConfig } from '../entities/mcp-server'
import type { ManageMcpServersUseCase, McpServerStatusInfo } from '../ports/inbound/manage-mcp-servers.usecase'
import type { McpServerRepository } from '../ports/outbound/mcp-server.repository'
import type { McpClientGateway } from '../ports/outbound/mcp-client.gateway'
import { generateId } from './id'

export class McpServerService implements ManageMcpServersUseCase {
  constructor(
    private readonly repo: McpServerRepository,
    private readonly client: McpClientGateway
  ) {}

  async listServers(): Promise<McpServerConfig[]> {
    return this.repo.findAll()
  }

  async createServer(
    name: string,
    command: string,
    args: string[],
    env: Record<string, string>
  ): Promise<McpServerConfig> {
    const now = new Date()
    const config: McpServerConfig = {
      id: generateId(),
      name,
      command,
      args,
      env,
      enabled: true,
      createdAt: now,
      updatedAt: now
    }
    await this.repo.save(config)

    // Auto-start
    try {
      await this.client.startServer(config.id, config.command, config.args, config.env)
    } catch {
      // Server saved but start failed — status will be 'error'
    }

    return config
  }

  async updateServer(
    id: string,
    updates: { name?: string; command?: string; args?: string[]; env?: Record<string, string>; enabled?: boolean }
  ): Promise<McpServerConfig> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new Error(`MCP server not found: ${id}`)

    const needsRestart =
      (updates.command !== undefined && updates.command !== existing.command) ||
      (updates.args !== undefined && JSON.stringify(updates.args) !== JSON.stringify(existing.args)) ||
      (updates.env !== undefined && JSON.stringify(updates.env) !== JSON.stringify(existing.env))

    const updated: McpServerConfig = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    }
    await this.repo.save(updated)

    if (needsRestart && updated.enabled) {
      try {
        await this.client.stopServer(id)
      } catch {
        // ignore stop errors
      }
      try {
        await this.client.startServer(id, updated.command, updated.args, updated.env)
      } catch {
        // start failed — status will be 'error'
      }
    }

    return updated
  }

  async deleteServer(id: string): Promise<void> {
    try {
      await this.client.stopServer(id)
    } catch {
      // ignore stop errors on delete
    }
    await this.repo.delete(id)
  }

  async startServer(id: string): Promise<void> {
    const config = await this.repo.findById(id)
    if (!config) throw new Error(`MCP server not found: ${id}`)
    await this.client.startServer(id, config.command, config.args, config.env)
  }

  async stopServer(id: string): Promise<void> {
    await this.client.stopServer(id)
  }

  async restartServer(id: string): Promise<void> {
    const config = await this.repo.findById(id)
    if (!config) throw new Error(`MCP server not found: ${id}`)
    try {
      await this.client.stopServer(id)
    } catch {
      // ignore
    }
    await this.client.startServer(id, config.command, config.args, config.env)
  }

  async getServerStatuses(): Promise<McpServerStatusInfo[]> {
    const servers = await this.repo.findAll()
    return servers.map((config) => ({
      config,
      status: this.client.getServerStatus(config.id),
      tools: this.client.getServerTools(config.id)
    }))
  }

  getServerLogs(id: string): string[] {
    return this.client.getServerLogs(id)
  }

  async startEnabledServers(): Promise<void> {
    const servers = await this.repo.findAll()
    for (const server of servers) {
      if (server.enabled) {
        try {
          await this.client.startServer(server.id, server.command, server.args, server.env)
        } catch {
          // log error but continue starting other servers
        }
      }
    }
  }

  getConfigPath(): string {
    return this.repo.getConfigPath()
  }

  async reloadConfig(): Promise<void> {
    await this.client.shutdownAll()
    await this.startEnabledServers()
  }
}
