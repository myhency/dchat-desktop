import type { BackupData } from '@dchat/shared'
import type { BackupRestoreUseCase } from '../ports/inbound/backup-restore.usecase'
import type { MessageRepository } from '../ports/outbound/message.repository'
import type { SessionRepository } from '../ports/outbound/session.repository'
import type { ProjectRepository } from '../ports/outbound/project.repository'
import type { SettingsRepository } from '../ports/outbound/settings.repository'
import type { SkillRepository } from '../ports/outbound/skill.repository'

const EXCLUDED_SETTINGS_KEYS = [
  'anthropic_api_key',
  'openai_api_key',
  'anthropic_base_url',
  'openai_base_url'
]

export class BackupService implements BackupRestoreUseCase {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly skillRepo?: SkillRepository
  ) {}

  async exportBackup(): Promise<BackupData> {
    const [allSettings, projects, sessions, skills] = await Promise.all([
      this.settingsRepo.getAll(),
      this.projectRepo.findAll(),
      this.sessionRepo.findAll(),
      this.skillRepo?.findAll() ?? Promise.resolve([])
    ])

    // Fetch messages for all sessions
    const messages = (
      await Promise.all(sessions.map((s) => this.messageRepo.findBySessionId(s.id)))
    ).flat()

    // Filter out API keys from settings
    const filteredSettings: Record<string, string> = {}
    for (const [key, value] of Object.entries(allSettings)) {
      if (!EXCLUDED_SETTINGS_KEYS.includes(key)) {
        filteredSettings[key] = value
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings: filteredSettings,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          instructions: p.instructions,
          isFavorite: p.isFavorite,
          memoryContent: p.memoryContent,
          memoryUpdatedAt: p.memoryUpdatedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        })),
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          model: s.model,
          projectId: s.projectId,
          isFavorite: s.isFavorite,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString()
        })),
        messages: messages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          role: m.role,
          content: m.content,
          attachments: m.attachments,
          createdAt: m.createdAt.toISOString()
        })),
        skills: skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          content: s.content,
          isEnabled: s.isEnabled,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString()
        }))
      }
    }
  }

  async importBackup(data: BackupData): Promise<void> {
    if (data.version !== 1) {
      throw new Error(`Unsupported backup version: ${data.version}`)
    }
    if (!data.data) {
      throw new Error('Invalid backup data: missing data field')
    }

    // Delete in FK order: messages → sessions → projects → settings → skills
    await this.messageRepo.deleteAll()
    await this.sessionRepo.deleteAll()
    await this.projectRepo.deleteAll()
    await this.settingsRepo.deleteAll()
    if (this.skillRepo) await this.skillRepo.deleteAll()

    // Insert in FK order: projects → sessions → messages → settings
    for (const p of data.data.projects ?? []) {
      await this.projectRepo.save({
        id: p.id,
        name: p.name,
        description: p.description,
        instructions: p.instructions,
        isFavorite: p.isFavorite,
        memoryContent: p.memoryContent ?? '',
        memoryUpdatedAt: p.memoryUpdatedAt ? new Date(p.memoryUpdatedAt) : null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      })
    }

    for (const s of data.data.sessions ?? []) {
      await this.sessionRepo.save({
        id: s.id,
        title: s.title,
        model: s.model,
        projectId: s.projectId,
        isFavorite: s.isFavorite,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      })
    }

    for (const m of data.data.messages ?? []) {
      await this.messageRepo.save({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role,
        content: m.content,
        attachments: m.attachments ?? [],
        createdAt: new Date(m.createdAt)
      })
    }

    for (const [key, value] of Object.entries(data.data.settings ?? {})) {
      // Skip API keys even if they somehow ended up in the backup
      if (!EXCLUDED_SETTINGS_KEYS.includes(key)) {
        await this.settingsRepo.set(key, value)
      }
    }

    if (this.skillRepo) {
      for (const s of data.data.skills ?? []) {
        await this.skillRepo.save({
          id: s.id,
          name: s.name,
          description: s.description,
          content: s.content,
          isEnabled: s.isEnabled,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt)
        })
      }
    }
  }
}
