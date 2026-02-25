import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const listDirectoryTool: BuiltInToolDef = {
  name: 'list_directory',
  description: 'List the contents of a directory. Returns file/directory names with type indicators.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the directory to list' }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const dirPath = args.path as string
    const validated = await validatePath(dirPath, config.allowedDirectories)

    const entries = await fs.readdir(validated, { withFileTypes: true })
    const lines = entries.map((entry) => {
      const prefix = entry.isDirectory() ? '[DIR]' : '[FILE]'
      return `${prefix} ${entry.name}`
    })

    return { content: lines.join('\n') || '(empty directory)', isError: false }
  }
}
