import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const readTextFileTool: BuiltInToolDef = {
  name: 'read_text_file',
  description: 'Read the contents of a text file. Optionally read only the first or last N lines using head/tail parameters. Only works within allowed directories.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to read' },
      head: { type: 'number', description: 'Read only the first N lines' },
      tail: { type: 'number', description: 'Read only the last N lines' }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const filePath = args.path as string
    const head = args.head as number | undefined
    const tail = args.tail as number | undefined

    if (head !== undefined && tail !== undefined) {
      return { content: 'Cannot specify both head and tail parameters', isError: true }
    }

    const validated = await validatePath(filePath, config.allowedDirectories)
    const content = await fs.readFile(validated, 'utf-8')

    if (head !== undefined) {
      const lines = content.split('\n')
      return { content: lines.slice(0, head).join('\n'), isError: false }
    }
    if (tail !== undefined) {
      const lines = content.split('\n')
      return { content: lines.slice(-tail).join('\n'), isError: false }
    }

    return { content, isError: false }
  }
}
