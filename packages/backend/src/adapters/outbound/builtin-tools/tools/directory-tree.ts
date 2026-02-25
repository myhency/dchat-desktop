import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

interface TreeNode {
  name: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

function matchesGlob(name: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i').test(name)
}

export const directoryTreeTool: BuiltInToolDef = {
  name: 'directory_tree',
  description: 'Get a recursive tree view of a directory structure as JSON. Excludes hidden files and node_modules by default.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Root directory for the tree' },
      excludePatterns: {
        type: 'array',
        description: 'Glob patterns for files/directories to exclude',
        items: { type: 'string' }
      }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const dirPath = args.path as string
    const excludePatterns = (args.excludePatterns as string[] | undefined) ?? []
    const validated = await validatePath(dirPath, config.allowedDirectories)

    async function buildTree(dir: string): Promise<TreeNode[]> {
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return []
      }

      const nodes: TreeNode[] = []
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        if (entry.name === 'node_modules') continue
        if (excludePatterns.some((ep) => matchesGlob(entry.name, ep))) continue

        if (entry.isDirectory()) {
          const children = await buildTree(path.join(dir, entry.name))
          nodes.push({ name: entry.name, type: 'directory', children })
        } else {
          nodes.push({ name: entry.name, type: 'file' })
        }
      }
      return nodes
    }

    const tree = await buildTree(validated)
    const root: TreeNode = {
      name: path.basename(validated),
      type: 'directory',
      children: tree
    }

    return { content: JSON.stringify(root, null, 2), isError: false }
  }
}
