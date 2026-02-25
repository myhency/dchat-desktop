import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

export const moveFileTool: BuiltInToolDef = {
  name: 'move_file',
  description: 'Move or rename a file or directory. Both source and destination must be within allowed directories.',
  inputSchema: {
    type: 'object',
    properties: {
      source: { type: 'string', description: 'Source path' },
      destination: { type: 'string', description: 'Destination path' }
    },
    required: ['source', 'destination']
  },
  isDangerous: true,
  async execute(args, config) {
    const source = args.source as string
    const destination = args.destination as string
    const validatedSource = await validatePath(source, config.allowedDirectories)
    const validatedDest = await validatePath(destination, config.allowedDirectories)

    await fs.rename(validatedSource, validatedDest)
    return { content: `Successfully moved ${source} to ${destination}`, isError: false }
  }
}
