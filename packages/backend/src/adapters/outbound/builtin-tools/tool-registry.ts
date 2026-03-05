export interface BuiltInToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  isDangerous: boolean
  execute: (args: Record<string, unknown>, config: ToolConfig, signal?: AbortSignal) => Promise<{ content: string; isError: boolean }>
}

export interface ToolConfig {
  allowedDirectories: string[]
  shellTimeout: number
  skillRepo?: import('../../../domain/ports/outbound/skill.repository').SkillRepository
}
