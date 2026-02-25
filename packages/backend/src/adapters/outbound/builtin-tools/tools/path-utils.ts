import * as path from 'path'
import * as fs from 'fs/promises'

/**
 * Resolve a directory to its real path (following symlinks).
 * Falls back to path.resolve() if the directory doesn't exist.
 */
async function resolveToReal(p: string): Promise<string> {
  try {
    return await fs.realpath(p)
  } catch {
    return path.resolve(p)
  }
}

/**
 * Find the nearest existing ancestor of a path and resolve it.
 * Returns the full real path by appending the non-existing suffix.
 */
async function resolveWithAncestor(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath)
  let current = resolved

  // Walk up until we find an existing directory
  const suffixParts: string[] = []
  while (true) {
    try {
      const real = await fs.realpath(current)
      // Append any non-existing parts
      return suffixParts.length > 0
        ? path.join(real, ...suffixParts.reverse())
        : real
    } catch {
      suffixParts.push(path.basename(current))
      const parent = path.dirname(current)
      if (parent === current) {
        // Reached root
        return resolved
      }
      current = parent
    }
  }
}

function isUnder(filePath: string, dir: string): boolean {
  return filePath === dir || filePath.startsWith(dir + path.sep)
}

/**
 * Validates that the given file path is within one of the allowed directories.
 * Resolves symlinks to prevent traversal attacks.
 */
export async function validatePath(filePath: string, allowedDirectories: string[]): Promise<string> {
  // Resolve allowed directories to real paths (handles macOS /var → /private/var etc.)
  const realAllowedDirs = await Promise.all(allowedDirectories.map(resolveToReal))

  // Resolve the target path, following existing symlinks
  const realPath = await resolveWithAncestor(filePath)

  const isAllowed = realAllowedDirs.some((dir) => isUnder(realPath, dir))
  if (!isAllowed) {
    throw new Error(`Access denied: ${path.resolve(filePath)} is outside allowed directories`)
  }

  return realPath
}
