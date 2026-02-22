import type { McpServerConfig } from '../../entities/mcp-server'

export interface McpServerRepository {
  findAll(): Promise<McpServerConfig[]>
  findById(id: string): Promise<McpServerConfig | null>
  save(config: McpServerConfig): Promise<void>
  delete(id: string): Promise<void>
  getConfigPath(): string
}
