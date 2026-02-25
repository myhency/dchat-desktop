import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const editFileTool: BuiltInToolDef = {
  name: 'edit_file',
  description: 'Replace a specific string in a file with new content. The old_string must match exactly once in the file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to edit' },
      old_string: { type: 'string', description: 'The exact string to find and replace' },
      new_string: { type: 'string', description: 'The replacement string' }
    },
    required: ['path', 'old_string', 'new_string']
  },
  isDangerous: true,
  async execute(args, config) {
    const filePath = args.path as string
    const oldString = args.old_string as string
    const newString = args.new_string as string
    const validated = await validatePath(filePath, config.allowedDirectories)

    const content = await fs.readFile(validated, 'utf-8')

    const occurrences = content.split(oldString).length - 1
    if (occurrences === 0) {
      return { content: `old_string not found in ${filePath}`, isError: true }
    }
    if (occurrences > 1) {
      return { content: `old_string found ${occurrences} times in ${filePath}. It must be unique.`, isError: true }
    }

    const newContent = content.replace(oldString, newString)
    await fs.writeFile(validated, newContent, 'utf-8')
    return { content: `Successfully edited ${filePath}`, isError: false }
  }
}
