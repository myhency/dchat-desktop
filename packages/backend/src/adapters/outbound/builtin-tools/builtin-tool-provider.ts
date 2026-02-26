import * as fs from 'fs/promises'
import type { McpToolDefinition } from '../../../domain/ports/outbound/mcp-client.gateway'
import type { SettingsRepository } from '../../../domain/ports/outbound/settings.repository'
import type { BuiltinToolsStatusDTO } from '@dchat/shared'
import type { BuiltInToolDef, ToolConfig } from './tool-registry'
import { readTextFileTool } from './tools/read-text-file'
import { writeFileTool } from './tools/write-file'
import { editFileTool } from './tools/edit-file'
import { listDirectoryTool } from './tools/list-directory'
import { searchFilesTool } from './tools/search-files'
import { createDirectoryTool } from './tools/create-directory'
import { readMediaFileTool } from './tools/read-media-file'
import { readMultipleFilesTool } from './tools/read-multiple-files'
import { listDirectoryWithSizesTool } from './tools/list-directory-with-sizes'
import { directoryTreeTool } from './tools/directory-tree'
import { moveFileTool } from './tools/move-file'
import { getFileInfoTool } from './tools/get-file-info'
import { listAllowedDirectoriesTool } from './tools/list-allowed-directories'
import { executeCommandTool } from './tools/execute-command'
import logger from '../../../logger'

export type ConfirmationHandler = (toolUseId: string, toolName: string, toolInput: Record<string, unknown>) => Promise<boolean>

export type ToolPermission = 'always' | 'confirm' | 'blocked'

const FILESYSTEM_TOOLS: BuiltInToolDef[] = [
  readTextFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  searchFilesTool,
  createDirectoryTool,
  readMediaFileTool,
  readMultipleFilesTool,
  listDirectoryWithSizesTool,
  directoryTreeTool,
  moveFileTool,
  getFileInfoTool,
  listAllowedDirectoriesTool
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

  private async getPermissions(): Promise<Record<string, ToolPermission>> {
    const json = await this.settingsRepo.get('builtin_tools_permissions')
    if (!json) return {}
    try {
      return JSON.parse(json)
    } catch {
      return {}
    }
  }

  private getToolPermission(permissions: Record<string, ToolPermission>, toolName: string, isDangerous: boolean): ToolPermission {
    if (permissions[toolName]) return permissions[toolName]
    return isDangerous ? 'confirm' : 'always'
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

    const permissions = await this.getPermissions()
    return tools.filter((t) => this.getToolPermission(permissions, t.name, t.isDangerous) !== 'blocked')
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
      logger.warn({ toolName, toolUseId }, 'Built-in tool not found')
      return { content: `Built-in tool "${toolName}" not found`, isError: true }
    }

    const permissions = await this.getPermissions()
    const permission = this.getToolPermission(permissions, toolName, tool.isDangerous)

    if (permission === 'blocked') {
      logger.info({ toolName, toolUseId }, 'Built-in tool blocked by settings')
      return { content: `Tool "${toolName}" is blocked by user settings.`, isError: true }
    }

    if (permission === 'confirm' && this.confirmFn && toolUseId) {
      try {
        logger.debug({ toolName, toolUseId }, 'Awaiting user confirmation')
        const approved = await this.confirmFn(toolUseId, toolName, args)
        if (!approved) {
          logger.info({ toolName, toolUseId }, 'Tool denied by user')
          return { content: 'User denied the tool execution.', isError: true }
        }
        logger.debug({ toolName, toolUseId }, 'Tool approved by user')
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
      logger.debug({ toolName, toolUseId }, 'Executing built-in tool')
      const result = await tool.execute(args, config)
      logger.debug({ toolName, toolUseId, isError: result.isError, contentLength: result.content.length }, 'Built-in tool completed')
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed'
      logger.error({ err, toolName }, 'Built-in tool execution error')
      return { content: message, isError: true }
    }
  }

  async getStatus(): Promise<BuiltinToolsStatusDTO> {
    const dirsJson = await this.settingsRepo.get('builtin_tools_allowed_dirs')
    const dirs: string[] = dirsJson ? JSON.parse(dirsJson) : []

    if (dirs.length === 0) {
      return { status: 'disabled', toolCount: 0, directories: [], errors: [] }
    }

    const errors: string[] = []
    for (const dir of dirs) {
      try {
        await fs.access(dir)
      } catch {
        errors.push(dir)
      }
    }

    const tools = await this.getActiveTools()

    return {
      status: errors.length > 0 ? 'error' : 'running',
      toolCount: tools.length,
      directories: dirs,
      errors
    }
  }
}
