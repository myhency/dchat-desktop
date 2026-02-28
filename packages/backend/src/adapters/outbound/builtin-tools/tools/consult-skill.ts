import type { BuiltInToolDef } from '../tool-registry'

export const consultSkillTool: BuiltInToolDef = {
  name: 'consult_skill',
  description: 'Load the full instructions of a skill by name. Use this when you need to follow a skill\'s detailed guidance.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The skill name to consult' }
    },
    required: ['name']
  },
  isDangerous: false,
  async execute(args, config) {
    const skillRepo = config.skillRepo
    if (!skillRepo) return { content: 'Skill system not available', isError: true }

    const skills = await skillRepo.findEnabled()
    const skill = skills.find(s => s.name === args.name as string)
    if (!skill) return { content: `Skill not found: ${args.name}`, isError: true }

    return { content: skill.content, isError: false }
  }
}
