import type { Skill } from '../../entities/skill'

export interface SkillRepository {
  findAll(): Promise<Skill[]>
  findById(id: string): Promise<Skill | null>
  findEnabled(): Promise<Skill[]>
  save(skill: Skill): Promise<void>
  delete(id: string): Promise<void>
  deleteAll(): Promise<void>
}
