import type { McpClientGateway, McpToolDefinition } from '../../../domain/ports/outbound/mcp-client.gateway'
import type { BuiltInToolProvider, ConfirmationHandler } from './builtin-tool-provider'
import logger from '../../../logger'

export class CompositeMcpClientGateway implements McpClientGateway {
  constructor(
    private readonly builtIn: BuiltInToolProvider,
    private readonly external: McpClientGateway
  ) {}

  // ── Confirmation handler pass-through ──

  setConfirmationHandler(fn: ConfirmationHandler): void {
    this.builtIn.setConfirmationHandler(fn)
  }

  clearConfirmationHandler(): void {
    this.builtIn.clearConfirmationHandler()
  }

  // ── Tool listing ──

  async getAllTools(): Promise<McpToolDefinition[]> {
    const builtInTools = await this.builtIn.getTools()
    const externalTools = this.external.getAllTools()
    // getAllTools on external is sync (returns McpToolDefinition[])
    return [...builtInTools, ...(externalTools as McpToolDefinition[])]
  }

  getServerTools(id: string): McpToolDefinition[] {
    if (id === '__builtin__') {
      return [] // Built-in tools are surfaced via getAllTools()
    }
    return this.external.getServerTools(id)
  }

  // ── Tool execution ──

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>, toolUseId?: string, signal?: AbortSignal): Promise<{ content: string; isError: boolean }> {
    logger.debug({ serverId, toolName, toolUseId }, 'Routing tool call')
    if (serverId === '__builtin__') {
      return this.builtIn.callTool(toolName, args, toolUseId, signal)
    }
    return this.external.callTool(serverId, toolName, args, toolUseId, signal)
  }

  // ── Server lifecycle (external only) ──

  async startServer(id: string, command: string, args: string[], env: Record<string, string>): Promise<void> {
    return this.external.startServer(id, command, args, env)
  }

  async stopServer(id: string): Promise<void> {
    return this.external.stopServer(id)
  }

  getServerStatus(id: string): 'stopped' | 'running' | 'error' {
    if (id === '__builtin__') return 'running'
    return this.external.getServerStatus(id)
  }

  getServerLogs(id: string): string[] {
    if (id === '__builtin__') return []
    return this.external.getServerLogs(id)
  }

  async shutdownAll(): Promise<void> {
    return this.external.shutdownAll()
  }
}
