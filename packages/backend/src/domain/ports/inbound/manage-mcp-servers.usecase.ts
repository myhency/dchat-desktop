import type { McpServerConfig, McpServerStatus } from '../../entities/mcp-server'
import type { McpToolDefinition } from '../outbound/mcp-client.gateway'

export interface McpServerStatusInfo {
  config: McpServerConfig
  status: McpServerStatus
  tools: McpToolDefinition[]
}

export interface ManageMcpServersUseCase {
  listServers(): Promise<McpServerConfig[]>
  createServer(name: string, command: string, args: string[], env: Record<string, string>): Promise<McpServerConfig>
  updateServer(id: string, updates: { name?: string; command?: string; args?: string[]; env?: Record<string, string>; enabled?: boolean }): Promise<McpServerConfig>
  deleteServer(id: string): Promise<void>
  startServer(id: string): Promise<void>
  stopServer(id: string): Promise<void>
  restartServer(id: string): Promise<void>
  getServerStatuses(): Promise<McpServerStatusInfo[]>
  getServerLogs(id: string): string[]
  startEnabledServers(): Promise<void>
  getConfigPath(): string
  reloadConfig(): Promise<void>
}
