import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export const listDirectoryWithSizesTool: BuiltInToolDef = {
  name: 'list_directory_with_sizes',
  description: 'List directory contents with file sizes. Supports sorting by name or size. Includes summary statistics.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the directory to list' },
      sortBy: {
        type: 'string',
        description: 'Sort order: "name" (default) or "size"',
        enum: ['name', 'size']
      }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const dirPath = args.path as string
    const sortBy = (args.sortBy as string) ?? 'name'
    const validated = await validatePath(dirPath, config.allowedDirectories)

    const entries = await fs.readdir(validated, { withFileTypes: true })

    const items: { name: string; isDir: boolean; size: number }[] = []
    for (const entry of entries) {
      const fullPath = path.join(validated, entry.name)
      try {
        const stat = await fs.stat(fullPath)
        items.push({ name: entry.name, isDir: entry.isDirectory(), size: stat.size })
      } catch {
        items.push({ name: entry.name, isDir: entry.isDirectory(), size: 0 })
      }
    }

    if (sortBy === 'size') {
      items.sort((a, b) => b.size - a.size)
    } else {
      items.sort((a, b) => a.name.localeCompare(b.name))
    }

    let fileCount = 0
    let dirCount = 0
    let totalSize = 0
    const lines = items.map((item) => {
      if (item.isDir) {
        dirCount++
        return `[DIR] ${item.name}/`
      }
      fileCount++
      totalSize += item.size
      return `[FILE] ${item.name} (${formatSize(item.size)})`
    })

    lines.push('')
    lines.push(`${fileCount} file(s), ${dirCount} directory(ies), total size: ${formatSize(totalSize)}`)

    return { content: lines.join('\n'), isError: false }
  }
}
