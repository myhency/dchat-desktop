import { apiFetch } from '@/shared/api/client'
import type { Skill, CreateSkillRequest, UpdateSkillRequest } from '@dchat/shared'

export const skillApi = {
  list: () => apiFetch<Skill[]>('/api/skills'),

  getById: (id: string) => apiFetch<Skill>(`/api/skills/${id}`),

  create: (body: CreateSkillRequest) =>
    apiFetch<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  update: (id: string, body: UpdateSkillRequest) =>
    apiFetch<Skill>(`/api/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  toggleEnabled: (id: string) =>
    apiFetch<Skill>(`/api/skills/${id}/toggle`, { method: 'PATCH' }),

  delete: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/skills/${id}`, { method: 'DELETE' })
}
