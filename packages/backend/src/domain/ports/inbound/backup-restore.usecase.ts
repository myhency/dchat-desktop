import type { BackupData } from '@dchat/shared'

export interface BackupRestoreUseCase {
  exportBackup(): Promise<BackupData>
  importBackup(data: BackupData): Promise<void>
}
