import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const writeFileTool: BuiltInToolDef = {
  name: 'write_file',
  description: 'Create a new file or overwrite an existing file with the provided content. Only works within allowed directories.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to write' },
      content: { type: 'string', description: 'Content to write to the file' }
    },
    required: ['path', 'content']
  },
  isDangerous: true,
  async execute(args, config) {
    const filePath = args.path as string
    const content = args.content as string
    const validated = await validatePath(filePath, config.allowedDirectories)
    await fs.writeFile(validated, content, 'utf-8')
    return { content: `Successfully wrote to ${filePath}`, isError: false }
  }
}
