import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

const MAX_RESULTS = 100

export const searchFilesTool: BuiltInToolDef = {
  name: 'search_files',
  description: 'Search for files matching a pattern in a directory tree. Returns matching file paths.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Base directory to search from' },
      pattern: { type: 'string', description: 'Search pattern (substring match on file/directory names)' }
    },
    required: ['path', 'pattern']
  },
  isDangerous: false,
  async execute(args, config) {
    const dirPath = args.path as string
    const pattern = (args.pattern as string).toLowerCase()
    const validated = await validatePath(dirPath, config.allowedDirectories)

    const results: string[] = []

    async function walk(dir: string): Promise<void> {
      if (results.length >= MAX_RESULTS) return
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) break
        if (entry.name.startsWith('.')) continue
        if (entry.name === 'node_modules') continue

        const fullPath = path.join(dir, entry.name)
        if (entry.name.toLowerCase().includes(pattern)) {
          results.push(fullPath)
        }
        if (entry.isDirectory()) {
          await walk(fullPath)
        }
      }
    }

    await walk(validated)

    if (results.length === 0) {
      return { content: `No files matching "${args.pattern}" found in ${dirPath}`, isError: false }
    }

    const suffix = results.length >= MAX_RESULTS ? `\n... (truncated at ${MAX_RESULTS} results)` : ''
    return { content: results.join('\n') + suffix, isError: false }
  }
}
