import { execFile } from 'child_process'
import type { BuiltInToolDef } from '../tool-registry'

export const executeCommandTool: BuiltInToolDef = {
  name: 'execute_command',
  description: 'Execute a shell command and return its output. The command runs with a timeout.',
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
      cwd: { type: 'string', description: 'Working directory (optional)' }
    },
    required: ['command']
  },
  isDangerous: true,
  async execute(args, config) {
    const command = args.command as string
    const cmdArgs = (args.args as string[] | undefined) ?? []
    const cwd = args.cwd as string | undefined

    return new Promise((resolve) => {
      execFile(
        command,
        cmdArgs,
        {
          timeout: config.shellTimeout,
          maxBuffer: 1024 * 1024,
          cwd,
          shell: true
        },
        (error, stdout, stderr) => {
          if (error) {
            const output = [stdout, stderr, error.message].filter(Boolean).join('\n')
            resolve({ content: output || 'Command failed', isError: true })
            return
          }
          const output = [stdout, stderr].filter(Boolean).join('\n')
          resolve({ content: output || '(no output)', isError: false })
        }
      )
    })
  }
}
