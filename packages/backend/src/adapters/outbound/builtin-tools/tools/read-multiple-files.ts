import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const readMultipleFilesTool: BuiltInToolDef = {
  name: 'read_multiple_files',
  description: 'Read the contents of multiple files simultaneously. Results include both successful reads and errors for individual files.',
  inputSchema: {
    type: 'object',
    properties: {
      paths: {
        type: 'array',
        description: 'List of file paths to read',
        items: { type: 'string' },
        minItems: 1
      }
    },
    required: ['paths']
  },
  isDangerous: false,
  async execute(args, config) {
    const paths = args.paths as string[]

    const results = await Promise.allSettled(
      paths.map(async (filePath) => {
        const validated = await validatePath(filePath, config.allowedDirectories)
        const content = await fs.readFile(validated, 'utf-8')
        return { path: filePath, content }
      })
    )

    const parts = results.map((result, i) => {
      const filePath = paths[i]
      if (result.status === 'fulfilled') {
        return `=== ${filePath} ===\n${result.value.content}\n---`
      }
      const error = result.reason instanceof Error ? result.reason.message : 'Read failed'
      return `=== ${filePath} ===\nError: ${error}\n---`
    })

    return { content: parts.join('\n'), isError: false }
  }
}
