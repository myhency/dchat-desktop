import { statSync, renameSync, unlinkSync, existsSync } from 'fs'
import { dirname, basename, join, extname } from 'path'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_ROTATED = 2 // current + 2 rotated

export function rotateLogIfNeeded(logPath: string): void {
  if (!existsSync(logPath)) return

  let size: number
  try {
    size = statSync(logPath).size
  } catch {
    return
  }

  if (size <= MAX_SIZE_BYTES) return

  const dir = dirname(logPath)
  const ext = extname(logPath) // .log
  const base = basename(logPath, ext) // dchat-backend

  function rotatedPath(index: number): string {
    return join(dir, `${base}.${index}${ext}`)
  }

  // Delete oldest rotated file
  const oldest = rotatedPath(MAX_ROTATED)
  if (existsSync(oldest)) {
    unlinkSync(oldest)
  }

  // Shift existing rotated files: .1 -> .2
  for (let i = MAX_ROTATED - 1; i >= 1; i--) {
    const from = rotatedPath(i)
    if (existsSync(from)) {
      renameSync(from, rotatedPath(i + 1))
    }
  }

  // Rotate current -> .1
  renameSync(logPath, rotatedPath(1))
}
