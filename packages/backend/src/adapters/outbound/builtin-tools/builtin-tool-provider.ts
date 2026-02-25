import type { McpToolDefinition } from '../../../domain/ports/outbound/mcp-client.gateway'
import type { SettingsRepository } from '../../../domain/ports/outbound/settings.repository'
import type { BuiltInToolDef, ToolConfig } from './tool-registry'
import { readFileTool } from './tools/read-file'
import { writeFileTool } from './tools/write-file'
import { editFileTool } from './tools/edit-file'
import { listDirectoryTool } from './tools/list-directory'
import { searchFilesTool } from './tools/search-files'
import { createDirectoryTool } from './tools/create-directory'
import { executeCommandTool } from './tools/execute-command'
import logger from '../../../logger'

export type ConfirmationHandler = (toolUseId: string, toolName: string, toolInput: Record<string, unknown>) => Promise<boolean>

const FILESYSTEM_TOOLS: BuiltInToolDef[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  searchFilesTool,
  createDirectoryTool
]

const SHELL_TOOLS: BuiltInToolDef[] = [
  executeCommandTool
]

export class BuiltInToolProvider {
  static readonly SERVER_ID = '__builtin__'

  private confirmFn?: ConfirmationHandler

  constructor(private readonly settingsRepo: SettingsRepository) {}

  setConfirmationHandler(fn: ConfirmationHandler): void {
    this.confirmFn = fn
  }

  clearConfirmationHandler(): void {
    this.confirmFn = undefined
  }

  async getActiveTools(): Promise<BuiltInToolDef[]> {
    const dirsJson = await this.settingsRepo.get('builtin_tools_allowed_dirs')
    const dirs: string[] = dirsJson ? JSON.parse(dirsJson) : []
    if (dirs.length === 0) return []

    const shellEnabled = await this.settingsRepo.get('builtin_tools_shell_enabled')
    const tools = [...FILESYSTEM_TOOLS]
    if (shellEnabled === 'true') {
      tools.push(...SHELL_TOOLS)
    }
    return tools
  }

  async getTools(): Promise<McpToolDefinition[]> {
    const tools = await this.getActiveTools()
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      serverId: BuiltInToolProvider.SERVER_ID
    }))
  }

  async callTool(toolName: string, args: Record<string, unknown>, toolUseId?: string): Promise<{ content: string; isError: boolean }> {
    const tools = await this.getActiveTools()
    const tool = tools.find((t) => t.name === toolName)
    if (!tool) {
      return { content: `Built-in tool "${toolName}" not found`, isError: true }
    }

    // Dangerous tool confirmation
    if (tool.isDangerous && this.confirmFn && toolUseId) {
      try {
        const approved = await this.confirmFn(toolUseId, toolName, args)
        if (!approved) {
          return { content: 'User denied the tool execution.', isError: true }
        }
      } catch (err) {
        logger.error({ err, toolName, toolUseId }, 'Tool confirmation error')
        return { content: 'Tool confirmation failed.', isError: true }
      }
    }

    // Load config
    const dirsJson = await this.settingsRepo.get('builtin_tools_allowed_dirs')
    const allowedDirectories: string[] = dirsJson ? JSON.parse(dirsJson) : []
    const timeoutStr = await this.settingsRepo.get('builtin_tools_shell_timeout')
    const shellTimeout = timeoutStr ? parseInt(timeoutStr, 10) : 30000

    const config: ToolConfig = { allowedDirectories, shellTimeout }

    try {
      return await tool.execute(args, config)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed'
      logger.error({ err, toolName }, 'Built-in tool execution error')
      return { content: message, isError: true }
    }
  }
}
