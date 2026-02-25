import * as fs from 'fs/promises'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

function generateUnifiedDiff(original: string, modified: string, filePath: string): string {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')

  const lines: string[] = []
  lines.push(`--- a/${filePath}`)
  lines.push(`+++ b/${filePath}`)

  // Simple line-by-line diff: find consecutive runs of changes
  let i = 0
  let j = 0
  while (i < origLines.length || j < modLines.length) {
    // Skip matching lines
    if (i < origLines.length && j < modLines.length && origLines[i] === modLines[j]) {
      i++
      j++
      continue
    }

    // Found a difference — find the extent of changed region
    const startI = i
    const startJ = j

    // Advance through differing lines
    // Find next matching pair using a simple lookahead
    let found = false
    while (i < origLines.length || j < modLines.length) {
      // Check if remaining lines match
      if (i < origLines.length && j < modLines.length && origLines[i] === modLines[j]) {
        found = true
        break
      }
      // Advance the shorter side, or both if equal length
      if (i < origLines.length && (j >= modLines.length || (i - startI) <= (j - startJ))) {
        i++
      } else if (j < modLines.length) {
        j++
      } else {
        break
      }
    }

    // Emit hunk
    const ctxStart = Math.max(0, startI - 3)
    const ctxEnd = found ? Math.min(i + 3, origLines.length) : origLines.length
    const ctxStartJ = Math.max(0, startJ - 3)

    const hunkOrig = ctxEnd - ctxStart
    const hunkMod = (ctxStartJ + (startJ - ctxStart)) + (j - startJ) + (ctxEnd - i) - ctxStartJ
    lines.push(`@@ -${ctxStart + 1},${hunkOrig} +${ctxStartJ + 1},${hunkMod > 0 ? hunkMod : 0} @@`)

    // Leading context
    for (let c = ctxStart; c < startI; c++) {
      lines.push(` ${origLines[c]}`)
    }
    // Removed lines
    for (let c = startI; c < i; c++) {
      lines.push(`-${origLines[c]}`)
    }
    // Added lines
    for (let c = startJ; c < j; c++) {
      lines.push(`+${modLines[c]}`)
    }
    // Trailing context
    const trailEnd = Math.min(i + 3, origLines.length)
    for (let c = i; c < trailEnd; c++) {
      lines.push(` ${origLines[c]}`)
    }

    // Skip past trailing context in both
    const trailCount = trailEnd - i
    i = trailEnd
    j = j + trailCount
  }

  return lines.join('\n')
}

export const editFileTool: BuiltInToolDef = {
  name: 'edit_file',
  description: 'Make edits to a text file by replacing text sequences. Each edit replaces an exact match of oldText with newText. Returns a git-style diff of the changes. Use dryRun to preview changes without saving.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to edit' },
      edits: {
        type: 'array',
        description: 'List of edits to apply sequentially',
        items: {
          type: 'object',
          properties: {
            oldText: { type: 'string', description: 'Text to find' },
            newText: { type: 'string', description: 'Text to replace with' }
          },
          required: ['oldText', 'newText']
        }
      },
      dryRun: { type: 'boolean', description: 'If true, return diff without modifying the file' }
    },
    required: ['path', 'edits']
  },
  isDangerous: true,
  async execute(args, config) {
    const filePath = args.path as string
    const edits = args.edits as Array<{ oldText: string; newText: string }>
    const dryRun = (args.dryRun as boolean) ?? false
    const validated = await validatePath(filePath, config.allowedDirectories)

    const original = await fs.readFile(validated, 'utf-8')
    let content = original

    for (const edit of edits) {
      const occurrences = content.split(edit.oldText).length - 1
      if (occurrences === 0) {
        return { content: `oldText not found in ${filePath}: "${edit.oldText.slice(0, 40)}"`, isError: true }
      }
      if (occurrences > 1) {
        return { content: `oldText found ${occurrences} times in ${filePath}. It must be unique.`, isError: true }
      }
      content = content.replace(edit.oldText, edit.newText)
    }

    const diff = generateUnifiedDiff(original, content, filePath)

    if (!dryRun) {
      await fs.writeFile(validated, content, 'utf-8')
    }

    const prefix = dryRun ? '(dry run) ' : ''
    return { content: `${prefix}${diff || 'No changes'}`, isError: false }
  }
}
