/**
 * SkillService 단위 테스트 — mock ports
 *
 * 도메인 서비스가 포트 인터페이스를 올바르게 오케스트레이션하는지 검증.
 * 외부 의존성 ZERO.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SkillService } from '../domain/services/skill.service'
import type { Skill } from '../domain/entities/skill'
import type { SkillRepository } from '../domain/ports/outbound/skill.repository'

// ── Helpers ──

function createMockSkill(overrides?: Partial<Skill>): Skill {
  return {
    id: 'sk1',
    name: 'Test Skill',
    description: 'A test skill',
    content: 'Do something specific',
    isEnabled: true,
    path: '/home/user/.dchat/skills/sk1',
    files: [{ name: 'SKILL.md', relativePath: 'SKILL.md', isDirectory: false }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }
}

// ── Tests ──

describe('SkillService', () => {
  let skillRepo: SkillRepository
  let skillService: SkillService

  beforeEach(() => {
    skillRepo = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findEnabled: vi.fn(async () => []),
      save: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {}),
      setEnabled: vi.fn(async () => {}),
      readFile: vi.fn(async () => ''),
      getSkillsPath: vi.fn(() => '/home/user/.dchat/skills'),
      extractArchive: vi.fn(async () => createMockSkill()),
      saveFiles: vi.fn(async () => createMockSkill())
    }

    skillService = new SkillService(skillRepo)
  })

  it('create: 올바른 필드로 스킬을 생성하고 저장함', async () => {
    const mockSaved = createMockSkill({ id: 'test-skill', name: '코드 리뷰어' })
    skillRepo.findById = vi.fn(async () => mockSaved)

    const skill = await skillService.create('코드 리뷰어', '코드를 검토합니다', '코드를 검토할 때...')

    expect(skill.name).toBe('코드 리뷰어')
    expect(skillRepo.save).toHaveBeenCalled()
  })

  it('list: repository의 모든 스킬을 반환함', async () => {
    const mockSkills = [createMockSkill({ id: 'sk1' }), createMockSkill({ id: 'sk2', name: 'Skill 2' })]
    skillRepo.findAll = vi.fn(async () => mockSkills)

    const result = await skillService.list()

    expect(result).toEqual(mockSkills)
    expect(skillRepo.findAll).toHaveBeenCalled()
  })

  it('getById: 존재하는 스킬을 반환함', async () => {
    const mockSkill = createMockSkill()
    skillRepo.findById = vi.fn(async () => mockSkill)

    const result = await skillService.getById('sk1')

    expect(result).toEqual(mockSkill)
    expect(skillRepo.findById).toHaveBeenCalledWith('sk1')
  })

  it('getById: 존재하지 않는 스킬은 에러를 던짐', async () => {
    await expect(skillService.getById('nonexistent'))
      .rejects.toThrow('Skill not found: nonexistent')
  })

  it('update: 부분 업데이트가 정상 동작함', async () => {
    const mockSkill = createMockSkill()
    skillRepo.findById = vi.fn(async () => ({ ...mockSkill }))

    const result = await skillService.update('sk1', { name: '새 이름' })

    expect(result.name).toBe('새 이름')
    expect(result.description).toBe(mockSkill.description)
    expect(result.content).toBe(mockSkill.content)
    expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(mockSkill.updatedAt.getTime())
    expect(skillRepo.save).toHaveBeenCalled()
  })

  it('update: 존재하지 않는 스킬은 에러를 던짐', async () => {
    await expect(skillService.update('nonexistent', { name: '새 이름' }))
      .rejects.toThrow('Skill not found: nonexistent')
  })

  it('delete: repository의 delete를 호출함', async () => {
    await skillService.delete('sk1')

    expect(skillRepo.delete).toHaveBeenCalledWith('sk1')
  })

  it('toggleEnabled: setEnabled를 호출하고 업데이트된 스킬을 반환함', async () => {
    const mockSkill = createMockSkill({ isEnabled: true })
    const toggledSkill = { ...mockSkill, isEnabled: false }
    skillRepo.findById = vi.fn()
      .mockResolvedValueOnce(mockSkill)
      .mockResolvedValueOnce(toggledSkill)

    const result = await skillService.toggleEnabled('sk1')

    expect(skillRepo.setEnabled).toHaveBeenCalledWith('sk1', false)
    expect(result.isEnabled).toBe(false)
  })

  it('toggleEnabled: 비활성 스킬을 활성화함', async () => {
    const mockSkill = createMockSkill({ isEnabled: false })
    const toggledSkill = { ...mockSkill, isEnabled: true }
    skillRepo.findById = vi.fn()
      .mockResolvedValueOnce(mockSkill)
      .mockResolvedValueOnce(toggledSkill)

    const result = await skillService.toggleEnabled('sk1')

    expect(skillRepo.setEnabled).toHaveBeenCalledWith('sk1', true)
    expect(result.isEnabled).toBe(true)
  })

  it('toggleEnabled: 존재하지 않는 스킬은 에러를 던짐', async () => {
    await expect(skillService.toggleEnabled('nonexistent'))
      .rejects.toThrow('Skill not found: nonexistent')
  })

  it('seedBuiltInSkills: no-op (파일시스템 기반이므로 시드 불필요)', async () => {
    await skillService.seedBuiltInSkills()
    // No exceptions thrown, no repo calls made
    expect(skillRepo.save).not.toHaveBeenCalled()
  })
})
