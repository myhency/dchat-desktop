export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverId: string
}

export interface McpClientGateway {
  startServer(id: string, command: string, args: string[], env: Record<string, string>): Promise<void>
  stopServer(id: string): Promise<void>
  getServerStatus(id: string): 'stopped' | 'running' | 'error'
  getServerTools(id: string): McpToolDefinition[]
  getAllTools(): McpToolDefinition[]
  callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<{ content: string; isError: boolean }>
  getServerLogs(id: string): string[]
  shutdownAll(): Promise<void>
}
