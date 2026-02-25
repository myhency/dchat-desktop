import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const readFileTool: BuiltInToolDef = {
  name: 'read_file',
  description: 'Read the complete contents of a file from the file system. Only works within allowed directories.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to read' }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const filePath = args.path as string
    const validated = await validatePath(filePath, config.allowedDirectories)
    const content = await fs.readFile(validated, 'utf-8')
    return { content, isError: false }
  }
}
