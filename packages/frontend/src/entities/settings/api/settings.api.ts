import { apiFetch } from '@/shared/api/client'

export const settingsApi = {
  getAll: () => apiFetch<Record<string, string>>('/api/settings'),

  get: (key: string) =>
    apiFetch<{ value: string | null }>(`/api/settings/${key}`).then((r) => r.value),

  set: (key: string, value: string) =>
    apiFetch(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    }),

  testConnection: (provider: 'anthropic' | 'openai') =>
    apiFetch<{ ok: boolean }>('/api/settings/connection-test', {
      method: 'POST',
      body: JSON.stringify({ provider })
    })
}
