import type { Skill } from '../entities/skill'
import type { ManageSkillUseCase } from '../ports/inbound/manage-skill.usecase'
import type { SkillRepository } from '../ports/outbound/skill.repository'

export class SkillService implements ManageSkillUseCase {
  constructor(private readonly skillRepo: SkillRepository) {}

  async create(name: string, description: string, content: string): Promise<Skill> {
    const id = this.toSlug(name)
    const now = new Date()
    const skill: Skill = {
      id,
      name,
      description,
      content,
      isEnabled: true,
      path: '',
      files: [],
      createdAt: now,
      updatedAt: now
    }
    await this.skillRepo.save(skill)
    // Re-read from filesystem to get actual path and files
    const saved = await this.skillRepo.findById(id)
    return saved ?? skill
  }

  async list(): Promise<Skill[]> {
    return this.skillRepo.findAll()
  }

  async getById(id: string): Promise<Skill> {
    const skill = await this.skillRepo.findById(id)
    if (!skill) {
      throw new Error(`Skill not found: ${id}`)
    }
    return skill
  }

  async update(id: string, updates: { name?: string; description?: string; content?: string; isEnabled?: boolean }): Promise<Skill> {
    const skill = await this.skillRepo.findById(id)
    if (!skill) {
      throw new Error(`Skill not found: ${id}`)
    }
    if (updates.name !== undefined) skill.name = updates.name
    if (updates.description !== undefined) skill.description = updates.description
    if (updates.content !== undefined) skill.content = updates.content
    if (updates.isEnabled !== undefined) skill.isEnabled = updates.isEnabled
    skill.updatedAt = new Date()
    await this.skillRepo.save(skill)
    return skill
  }

  async delete(id: string): Promise<void> {
    await this.skillRepo.delete(id)
  }

  async toggleEnabled(id: string): Promise<Skill> {
    const skill = await this.skillRepo.findById(id)
    if (!skill) {
      throw new Error(`Skill not found: ${id}`)
    }
    await this.skillRepo.setEnabled(id, !skill.isEnabled)
    const updated = await this.skillRepo.findById(id)
    return updated ?? skill
  }

  async uploadArchive(zipBuffer: Buffer): Promise<Skill> {
    return this.skillRepo.extractArchive(zipBuffer)
  }

  async uploadFiles(files: { relativePath: string; data: Buffer }[]): Promise<Skill> {
    return this.skillRepo.saveFiles(files)
  }

  async seedBuiltInSkills(): Promise<void> {
    // No-op: filesystem-based skills don't need seeding
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'untitled'
  }
}
