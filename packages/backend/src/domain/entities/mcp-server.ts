export type McpServerStatus = 'stopped' | 'running' | 'error'

export interface McpServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}
