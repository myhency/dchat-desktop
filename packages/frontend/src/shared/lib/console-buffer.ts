interface LogEntry {
  timestamp: string
  level: 'log' | 'warn' | 'error'
  message: string
}

const MAX_ENTRIES = 1000
const buffer: LogEntry[] = []

let initialized = false

export function initConsoleBuffer(): void {
  if (initialized) return
  initialized = true

  const levels = ['log', 'warn', 'error'] as const

  for (const level of levels) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      buffer.push({ timestamp: new Date().toISOString(), level, message })
      if (buffer.length > MAX_ENTRIES) {
        buffer.shift()
      }
    }
  }
}

export function getBufferedLogs(): LogEntry[] {
  return [...buffer]
}
