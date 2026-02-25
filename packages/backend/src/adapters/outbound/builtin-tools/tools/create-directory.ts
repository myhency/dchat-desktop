import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const createDirectoryTool: BuiltInToolDef = {
  name: 'create_directory',
  description: 'Create a new directory (and any missing parent directories). Only works within allowed directories.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path of the directory to create' }
    },
    required: ['path']
  },
  isDangerous: true,
  async execute(args, config) {
    const dirPath = args.path as string
    const validated = await validatePath(dirPath, config.allowedDirectories)
    await fs.mkdir(validated, { recursive: true })
    return { content: `Successfully created directory ${dirPath}`, isError: false }
  }
}
