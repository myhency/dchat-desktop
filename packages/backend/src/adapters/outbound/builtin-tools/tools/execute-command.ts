import { spawn } from 'child_process'
import type { BuiltInToolDef } from '../tool-registry'
import { checkCommandSafety } from './command-safety'

const MAX_OUTPUT_BYTES = 50 * 1024
const TRUNCATE_KEEP = 20 * 1024

function truncateOutput(output: string): string {
  if (Buffer.byteLength(output) <= MAX_OUTPUT_BYTES) return output
  const head = output.slice(0, TRUNCATE_KEEP)
  const tail = output.slice(-TRUNCATE_KEEP)
  return `${head}\n\n[... truncated ${Buffer.byteLength(output) - TRUNCATE_KEEP * 2} bytes ...]\n\n${tail}`
}

export const executeCommandTool: BuiltInToolDef = {
  name: 'execute_command',
  description:
    'Execute a shell command and return its output. Use only for tasks that cannot be done with dedicated file tools (read_text_file, write_file, edit_file, search_files, list_directory). Appropriate for: builds, tests, git, package install, scripts.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The command to execute' },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Command arguments (optional)',
        default: []
      },
      cwd: { type: 'string', description: 'Working directory (optional)' },
      description: { type: 'string', description: 'Brief description of command purpose (optional)' },
      run_in_background: { type: 'boolean', description: 'Run in background and return PID (optional, default false)', default: false }
    },
    required: ['command']
  },
  isDangerous: true,
  async execute(args, _config, signal?) {
    const command = args.command as string
    const cmdArgs = (args.args as string[] | undefined) ?? []
    const cwd = args.cwd as string | undefined
    const runInBackground = (args.run_in_background as boolean | undefined) ?? false

    // Safety check
    const safety = checkCommandSafety(command, cmdArgs)
    if (!safety.isSafe) {
      return { content: `Command blocked: ${safety.reason}`, isError: true }
    }

    const fullCommand = [command, ...cmdArgs].join(' ')

    // Background execution
    if (runInBackground) {
      const child = spawn(fullCommand, [], { cwd, shell: true, detached: true, stdio: 'ignore' })
      child.unref()
      return { content: `Background process started (PID: ${child.pid})`, isError: false }
    }

    // Foreground execution with AbortSignal support
    return new Promise((resolve) => {
      const child = spawn(fullCommand, [], {
        cwd,
        shell: true,
        timeout: 0,
        env: { ...process.env }
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      // AbortSignal → kill child process
      const onAbort = () => {
        child.kill('SIGTERM')
      }
      if (signal) {
        if (signal.aborted) {
          child.kill('SIGTERM')
        } else {
          signal.addEventListener('abort', onAbort, { once: true })
        }
      }

      child.on('close', (code) => {
        signal?.removeEventListener('abort', onAbort)

        if (signal?.aborted) {
          resolve({ content: 'Command aborted by user.', isError: true })
          return
        }

        const output = [stdout, stderr].filter(Boolean).join('\n')
        if (code !== 0) {
          resolve({ content: truncateOutput(output || `Command exited with code ${code}`), isError: true })
          return
        }
        resolve({ content: truncateOutput(output || '(no output)'), isError: false })
      })

      child.on('error', (err) => {
        signal?.removeEventListener('abort', onAbort)
        resolve({ content: err.message || 'Command failed', isError: true })
      })
    })
  }
}
