import type { Skill } from '../../entities/skill'

export interface ManageSkillUseCase {
  create(name: string, description: string, content: string): Promise<Skill>
  list(): Promise<Skill[]>
  getById(id: string): Promise<Skill>
  update(id: string, updates: { name?: string; description?: string; content?: string; isEnabled?: boolean }): Promise<Skill>
  delete(id: string): Promise<void>
  toggleEnabled(id: string): Promise<Skill>
}
