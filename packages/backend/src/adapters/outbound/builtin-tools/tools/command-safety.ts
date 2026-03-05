export interface CommandSafetyResult {
  isSafe: boolean
  reason?: string
}

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+(-[^\s]*)?r[^\s]*f[^\s]*\s+[/~](?:\s|$)/, reason: 'Recursive forced deletion of root or home directory' },
  { pattern: /\brm\s+(-[^\s]*)?f[^\s]*r[^\s]*\s+[/~](?:\s|$)/, reason: 'Recursive forced deletion of root or home directory' },
  { pattern: /\bsudo\b/, reason: 'Privilege escalation via sudo is not allowed' },
  { pattern: /\bdd\b/, reason: 'Direct disk write via dd is not allowed' },
  { pattern: /\bmkfs\b/, reason: 'Filesystem formatting via mkfs is not allowed' },
  { pattern: /\bchmod\s+777\b/, reason: 'Setting world-writable permissions (chmod 777) is not allowed' },
  { pattern: />\s*\/dev\/[sh]d[a-z]/, reason: 'Direct device write is not allowed' },
  { pattern: /\bcurl\b.*\|\s*(ba)?sh/, reason: 'Piping remote content to shell is not allowed' },
  { pattern: /\bwget\b.*\|\s*(ba)?sh/, reason: 'Piping remote content to shell is not allowed' },
  { pattern: /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;?\s*:/, reason: 'Fork bomb detected' },
]

export function checkCommandSafety(command: string, args: string[]): CommandSafetyResult {
  const fullCommand = [command, ...args].join(' ')

  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(fullCommand)) {
      return { isSafe: false, reason }
    }
  }

  return { isSafe: true }
}
