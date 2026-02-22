import { apiFetch } from '@/shared/api/client'
import type { BackupData } from '@dchat/shared'

export const backupApi = {
  exportBackup: () => apiFetch<BackupData>('/api/backup/export'),
  importBackup: (data: BackupData) =>
    apiFetch<{ ok: boolean }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}
