import { apiFetch, getApiBase } from '@/shared/api/client'
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
    apiFetch<{ ok: boolean }>(`/api/skills/${id}`, { method: 'DELETE' }),

  readFile: async (skillId: string, relativePath: string): Promise<string> => {
    const res = await fetch(`${getApiBase()}/api/skills/${skillId}/file?path=${encodeURIComponent(relativePath)}`)
    if (!res.ok) throw new Error(`Failed to read file: ${res.statusText}`)
    return res.text()
  },

  getConfig: () => apiFetch<{ skillsPath: string }>('/api/skills/config'),

  uploadArchive: (data: string) =>
    apiFetch<Skill>('/api/skills/upload', {
      method: 'POST',
      body: JSON.stringify({ type: 'archive', data })
    }),

  uploadFiles: (files: { relativePath: string; data: string }[]) =>
    apiFetch<Skill>('/api/skills/upload', {
      method: 'POST',
      body: JSON.stringify({ type: 'files', files })
    })
}
