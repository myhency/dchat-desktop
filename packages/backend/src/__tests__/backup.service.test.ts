/**
 * BackupService 단위 테스트 — mock ports
 *
 * export/import 동작, API 키 제외, 잘못된 데이터 검증.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService } from '../domain/services/backup.service'
import type { Message } from '../domain/entities/message'
import type { Session } from '../domain/entities/session'
import type { Project } from '../domain/entities/project'
import type { MessageRepository } from '../domain/ports/outbound/message.repository'
import type { SessionRepository } from '../domain/ports/outbound/session.repository'
import type { ProjectRepository } from '../domain/ports/outbound/project.repository'
import type { SettingsRepository } from '../domain/ports/outbound/settings.repository'
import type { BackupData } from '@dchat/shared'

// ── Helpers ──

function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'p1',
    name: 'Test Project',
    description: 'desc',
    instructions: 'inst',
    isFavorite: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides
  }
}

function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 's1',
    title: 'Test Session',
    model: 'claude-haiku-4-5',
    projectId: null,
    isFavorite: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides
  }
}

function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'm1',
    sessionId: 's1',
    role: 'user',
    content: 'Hello',
    attachments: [],
    createdAt: new Date('2026-01-01'),
    ...overrides
  }
}

// ── Tests ──

describe('BackupService', () => {
  let messageRepo: MessageRepository
  let sessionRepo: SessionRepository
  let projectRepo: ProjectRepository
  let settingsRepo: SettingsRepository
  let backupService: BackupService

  beforeEach(() => {
    messageRepo = {
      findBySessionId: vi.fn(async () => []),
      save: vi.fn(async () => {}),
      updateContent: vi.fn(async () => {}),
      deleteById: vi.fn(async () => {}),
      deleteBySessionId: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    sessionRepo = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      findByProjectId: vi.fn(async () => []),
      save: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    projectRepo = {
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    settingsRepo = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => ({})),
      deleteAll: vi.fn(async () => {})
    }

    backupService = new BackupService(messageRepo, sessionRepo, projectRepo, settingsRepo)
  })

  describe('exportBackup', () => {
    it('모든 데이터가 백업에 포함됨', async () => {
      const project = createMockProject()
      const session = createMockSession()
      const message = createMockMessage()

      ;(projectRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([project])
      ;(sessionRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([session])
      ;(messageRepo.findBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue([message])
      ;(settingsRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        selected_model: 'claude-haiku-4-5',
        custom_instructions: 'be concise'
      })

      const result = await backupService.exportBackup()

      expect(result.version).toBe(1)
      expect(result.exportedAt).toBeTruthy()
      expect(result.data.projects).toHaveLength(1)
      expect(result.data.projects[0].id).toBe('p1')
      expect(result.data.sessions).toHaveLength(1)
      expect(result.data.sessions[0].id).toBe('s1')
      expect(result.data.messages).toHaveLength(1)
      expect(result.data.messages[0].id).toBe('m1')
      expect(result.data.settings).toEqual({
        selected_model: 'claude-haiku-4-5',
        custom_instructions: 'be concise'
      })
    })

    it('API 키 및 Base URL이 백업에서 제외됨', async () => {
      ;(settingsRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        anthropic_api_key: 'sk-ant-123',
        openai_api_key: 'sk-openai-123',
        anthropic_base_url: 'https://custom.api.com',
        openai_base_url: 'https://custom.openai.com',
        selected_model: 'claude-haiku-4-5',
        custom_instructions: 'test'
      })

      const result = await backupService.exportBackup()

      expect(result.data.settings).toEqual({
        selected_model: 'claude-haiku-4-5',
        custom_instructions: 'test'
      })
      expect(result.data.settings).not.toHaveProperty('anthropic_api_key')
      expect(result.data.settings).not.toHaveProperty('openai_api_key')
      expect(result.data.settings).not.toHaveProperty('anthropic_base_url')
      expect(result.data.settings).not.toHaveProperty('openai_base_url')
    })

    it('Date 필드가 ISO string으로 변환됨', async () => {
      const session = createMockSession({ createdAt: new Date('2026-01-15T10:30:00Z') })
      ;(sessionRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([session])

      const result = await backupService.exportBackup()

      expect(result.data.sessions[0].createdAt).toBe('2026-01-15T10:30:00.000Z')
    })
  })

  describe('importBackup', () => {
    const validBackup: BackupData = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: {
        settings: { selected_model: 'claude-haiku-4-5' },
        projects: [{
          id: 'p1', name: 'Project', description: 'desc', instructions: 'inst',
          isFavorite: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z'
        }],
        sessions: [{
          id: 's1', title: 'Session', model: 'claude-haiku-4-5', projectId: null,
          isFavorite: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z'
        }],
        messages: [{
          id: 'm1', sessionId: 's1', role: 'user', content: 'Hello',
          attachments: [], createdAt: '2026-01-01T00:00:00.000Z'
        }]
      }
    }

    it('기존 데이터가 모두 삭제됨', async () => {
      await backupService.importBackup(validBackup)

      expect(messageRepo.deleteAll).toHaveBeenCalledTimes(1)
      expect(sessionRepo.deleteAll).toHaveBeenCalledTimes(1)
      expect(projectRepo.deleteAll).toHaveBeenCalledTimes(1)
      expect(settingsRepo.deleteAll).toHaveBeenCalledTimes(1)
    })

    it('새 데이터가 삽입됨', async () => {
      await backupService.importBackup(validBackup)

      expect(projectRepo.save).toHaveBeenCalledTimes(1)
      expect(sessionRepo.save).toHaveBeenCalledTimes(1)
      expect(messageRepo.save).toHaveBeenCalledTimes(1)
      expect(settingsRepo.set).toHaveBeenCalledWith('selected_model', 'claude-haiku-4-5')
    })

    it('삭제 순서: messages → sessions → projects → settings', async () => {
      const callOrder: string[] = []
      ;(messageRepo.deleteAll as ReturnType<typeof vi.fn>).mockImplementation(async () => { callOrder.push('messages') })
      ;(sessionRepo.deleteAll as ReturnType<typeof vi.fn>).mockImplementation(async () => { callOrder.push('sessions') })
      ;(projectRepo.deleteAll as ReturnType<typeof vi.fn>).mockImplementation(async () => { callOrder.push('projects') })
      ;(settingsRepo.deleteAll as ReturnType<typeof vi.fn>).mockImplementation(async () => { callOrder.push('settings') })

      await backupService.importBackup(validBackup)

      expect(callOrder).toEqual(['messages', 'sessions', 'projects', 'settings'])
    })

    it('잘못된 버전에 대한 에러', async () => {
      const badVersion = { ...validBackup, version: 99 as any }

      await expect(backupService.importBackup(badVersion))
        .rejects.toThrow('Unsupported backup version: 99')
    })

    it('data 필드 누락 시 에러', async () => {
      const noData = { version: 1 as const, exportedAt: '', data: undefined as any }

      await expect(backupService.importBackup(noData))
        .rejects.toThrow('Invalid backup data: missing data field')
    })

    it('import 시 API 키가 포함되어 있어도 무시됨', async () => {
      const backupWithKeys: BackupData = {
        ...validBackup,
        data: {
          ...validBackup.data,
          settings: {
            selected_model: 'claude-haiku-4-5',
            anthropic_api_key: 'sk-should-be-ignored',
            openai_api_key: 'sk-should-be-ignored'
          }
        }
      }

      await backupService.importBackup(backupWithKeys)

      const setCalls = (settingsRepo.set as ReturnType<typeof vi.fn>).mock.calls
      const setKeys = setCalls.map((c: any[]) => c[0])
      expect(setKeys).not.toContain('anthropic_api_key')
      expect(setKeys).not.toContain('openai_api_key')
      expect(setKeys).toContain('selected_model')
    })
  })
})
