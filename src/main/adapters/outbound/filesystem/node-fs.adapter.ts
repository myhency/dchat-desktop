import { readFile, readdir, access } from 'fs/promises'
import { join } from 'path'
import type { FileSystemGateway, FileEntry } from '../../../domain/ports/outbound/file-system.gateway'

export class NodeFsAdapter implements FileSystemGateway {
  async readFile(path: string): Promise<string> {
    return readFile(path, 'utf-8')
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      path: join(path, entry.name),
      isDirectory: entry.isDirectory()
    }))
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }
}
