import type { BuiltInToolDef } from '../tool-registry'

export const listAllowedDirectoriesTool: BuiltInToolDef = {
  name: 'list_allowed_directories',
  description: 'Returns the list of directories that this server is allowed to access.',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  isDangerous: false,
  async execute(_args, config) {
    if (config.allowedDirectories.length === 0) {
      return { content: 'No allowed directories configured.', isError: false }
    }
    return {
      content: 'Allowed directories:\n' + config.allowedDirectories.join('\n'),
      isError: false
    }
  }
}
