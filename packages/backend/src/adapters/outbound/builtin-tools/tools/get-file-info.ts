import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const getFileInfoTool: BuiltInToolDef = {
  name: 'get_file_info',
  description: 'Get detailed metadata about a file or directory including size, timestamps, and permissions.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file or directory' }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const filePath = args.path as string
    const validated = await validatePath(filePath, config.allowedDirectories)

    const stat = await fs.stat(validated)
    const type = stat.isDirectory() ? 'directory' : stat.isSymbolicLink() ? 'symlink' : 'file'
    const permissions = '0' + (stat.mode & 0o777).toString(8)

    const lines = [
      `Name: ${path.basename(validated)}`,
      `Type: ${type}`,
      `Size: ${stat.size}`,
      `Created: ${stat.birthtime.toISOString()}`,
      `Modified: ${stat.mtime.toISOString()}`,
      `Accessed: ${stat.atime.toISOString()}`,
      `Permissions: ${permissions}`
    ]

    return { content: lines.join('\n'), isError: false }
  }
}
