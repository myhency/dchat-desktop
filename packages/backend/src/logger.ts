import pino from 'pino'
import { rotateLogIfNeeded } from './log-rotation'

export function createLogger(logPath?: string): pino.Logger {
  const level = process.env.LOG_LEVEL || 'info'
  const isDev = process.env.NODE_ENV !== 'production'

  if (!logPath) {
    return pino({
      level,
      ...(isDev
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' }
            }
          }
        : {})
    })
  }

  rotateLogIfNeeded(logPath)

  const targets: pino.TransportTargetOptions[] = [
    // File: always JSON
    { target: 'pino/file', options: { destination: logPath, mkdir: true }, level }
  ]

  if (isDev) {
    // Dev: pretty stdout + JSON file
    targets.push({
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
      level
    })
  } else {
    // Prod: JSON stdout + JSON file
    targets.push({ target: 'pino/file', options: { destination: 1 }, level })
  }

  return pino({ level, transport: { targets } })
}

const logger = createLogger(process.env.DCHAT_LOG_PATH)

export default logger
