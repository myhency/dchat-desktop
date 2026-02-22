import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { McpClientGateway, McpToolDefinition } from '../../../domain/ports/outbound/mcp-client.gateway'
import logger from '../../../logger'

interface ServerEntry {
  client: Client
  transport: StdioClientTransport
  tools: McpToolDefinition[]
  status: 'running' | 'error'
  logs: string[]
}

const MAX_LOG_LINES = 500

export class StdioMcpClientManager implements McpClientGateway {
  private servers = new Map<string, ServerEntry>()

  async startServer(id: string, command: string, args: string[], env: Record<string, string>): Promise<void> {
    // Stop existing if running
    if (this.servers.has(id)) {
      await this.stopServer(id)
    }

    const mergedEnv: Record<string, string> = {}
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) mergedEnv[k] = v
    }
    Object.assign(mergedEnv, env)

    const transport = new StdioClientTransport({
      command,
      args,
      env: mergedEnv
    })

    const client = new Client(
      { name: 'dchat-desktop', version: '1.0.0' },
      { capabilities: {} }
    )

    const logs: string[] = []

    transport.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        logs.push(line)
        if (logs.length > MAX_LOG_LINES) logs.shift()
      }
    })

    try {
      await client.connect(transport)

      // List tools
      const result = await client.listTools()
      const tools: McpToolDefinition[] = (result.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
        serverId: id
      }))

      this.servers.set(id, { client, transport, tools, status: 'running', logs })
      logger.info({ serverId: id, toolCount: tools.length }, 'MCP server started')
    } catch (error) {
      this.servers.set(id, { client, transport, tools: [], status: 'error', logs })
      logger.error({ err: error, serverId: id }, 'MCP server start failed')
      throw error
    }
  }

  async stopServer(id: string): Promise<void> {
    const entry = this.servers.get(id)
    if (!entry) return

    try {
      await entry.client.close()
    } catch {
      // ignore close errors
    }
    this.servers.delete(id)
    logger.info({ serverId: id }, 'MCP server stopped')
  }

  getServerStatus(id: string): 'stopped' | 'running' | 'error' {
    const entry = this.servers.get(id)
    if (!entry) return 'stopped'
    return entry.status
  }

  getServerTools(id: string): McpToolDefinition[] {
    return this.servers.get(id)?.tools ?? []
  }

  getAllTools(): McpToolDefinition[] {
    const tools: McpToolDefinition[] = []
    this.servers.forEach((entry) => {
      if (entry.status === 'running') {
        tools.push(...entry.tools)
      }
    })
    return tools
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<{ content: string; isError: boolean }> {
    const entry = this.servers.get(serverId)
    if (!entry || entry.status !== 'running') {
      return { content: `MCP server ${serverId} is not running`, isError: true }
    }

    try {
      const result = await entry.client.callTool({ name: toolName, arguments: args })

      // Extract text content from result
      const textParts: string[] = []
      if (Array.isArray(result.content)) {
        for (const part of result.content) {
          if (part.type === 'text') {
            textParts.push(part.text as string)
          }
        }
      }

      return {
        content: textParts.join('\n') || JSON.stringify(result.content),
        isError: result.isError === true
      }
    } catch (error) {
      logger.error({ err: error, serverId, toolName }, 'MCP tool call failed')
      return {
        content: error instanceof Error ? error.message : 'Tool call failed',
        isError: true
      }
    }
  }

  getServerLogs(id: string): string[] {
    return this.servers.get(id)?.logs ?? []
  }

  async shutdownAll(): Promise<void> {
    const ids = Array.from(this.servers.keys())
    for (const id of ids) {
      await this.stopServer(id)
    }
  }
}
