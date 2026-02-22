export interface SettingsRepository {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  getAll(): Promise<Record<string, string>>
  deleteAll(): Promise<void>
}
