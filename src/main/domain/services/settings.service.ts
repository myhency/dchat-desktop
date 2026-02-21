import type { ManageSettingsUseCase } from '../ports/inbound/manage-settings.usecase'
import type { SettingsRepository } from '../ports/outbound/settings.repository'

export class SettingsService implements ManageSettingsUseCase {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  async get(key: string): Promise<string | null> {
    return this.settingsRepo.get(key)
  }

  async set(key: string, value: string): Promise<void> {
    return this.settingsRepo.set(key, value)
  }

  async getAll(): Promise<Record<string, string>> {
    return this.settingsRepo.getAll()
  }
}
