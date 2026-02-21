export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface FileSystemGateway {
  readFile(path: string): Promise<string>
  listDirectory(path: string): Promise<FileEntry[]>
  exists(path: string): Promise<boolean>
}
