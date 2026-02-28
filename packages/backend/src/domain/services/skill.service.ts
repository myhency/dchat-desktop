import type { Skill } from '../entities/skill'
import type { ManageSkillUseCase } from '../ports/inbound/manage-skill.usecase'
import type { SkillRepository } from '../ports/outbound/skill.repository'
import { generateId } from './id'
import { SKILL_CREATOR_CONTENT } from './skill-creator-content'

const BUILTIN_SKILL_CREATOR_NAME = 'skill-creator'
const BUILTIN_SKILL_CREATOR_DESCRIPTION = 'Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, update or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill\'s description for better triggering accuracy.'
const OLD_BUILTIN_SKILL_CREATOR_NAME = '스킬 크리에이터'

export class SkillService implements ManageSkillUseCase {
  constructor(private readonly skillRepo: SkillRepository) {}

  async create(name: string, description: string, content: string): Promise<Skill> {
    const now = new Date()
    const skill: Skill = {
      id: generateId(),
      name,
      description,
      content,
      isEnabled: true,
      createdAt: now,
      updatedAt: now
    }
    await this.skillRepo.save(skill)
    return skill
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
    skill.isEnabled = !skill.isEnabled
    skill.updatedAt = new Date()
    await this.skillRepo.save(skill)
    return skill
  }

  async seedBuiltInSkills(): Promise<void> {
    const existing = await this.skillRepo.findAll()

    // 구버전 한국어 skill-creator 마이그레이션 → 삭제
    const oldCreator = existing.find((s) => s.name === OLD_BUILTIN_SKILL_CREATOR_NAME)
    if (oldCreator) {
      await this.skillRepo.delete(oldCreator.id)
    }

    const hasCreator = existing.some((s) => s.name === BUILTIN_SKILL_CREATOR_NAME)
    if (!hasCreator) {
      await this.create(
        BUILTIN_SKILL_CREATOR_NAME,
        BUILTIN_SKILL_CREATOR_DESCRIPTION,
        SKILL_CREATOR_CONTENT
      )
    }
  }
}
