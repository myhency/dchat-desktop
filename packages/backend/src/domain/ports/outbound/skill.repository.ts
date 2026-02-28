import type { Skill } from '../../entities/skill'

export interface SkillRepository {
  findAll(): Promise<Skill[]>
  findById(id: string): Promise<Skill | null>
  findEnabled(): Promise<Skill[]>
  save(skill: Skill): Promise<void>
  delete(id: string): Promise<void>
  deleteAll(): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<void>
  readFile(skillId: string, relativePath: string): Promise<string>
  getSkillsPath(): string
  extractArchive(zipBuffer: Buffer): Promise<Skill>
  saveFiles(files: { relativePath: string; data: Buffer }[]): Promise<Skill>
}
