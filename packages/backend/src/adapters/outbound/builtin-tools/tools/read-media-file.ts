import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm'
}

export const readMediaFileTool: BuiltInToolDef = {
  name: 'read_media_file',
  description: 'Read an image or audio file and return its contents as base64 encoded data with MIME type.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the media file to read' }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const filePath = args.path as string
    const validated = await validatePath(filePath, config.allowedDirectories)

    const ext = path.extname(filePath).toLowerCase()
    const mimeType = MIME_TYPES[ext]
    if (!mimeType) {
      return { content: `Unsupported media type: ${ext}`, isError: true }
    }

    const buffer = await fs.readFile(validated)
    const base64Data = buffer.toString('base64')

    return {
      content: JSON.stringify({ mimeType, base64Data }),
      isError: false
    }
  }
}
