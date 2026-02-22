import { apiFetch } from './client'
import type { Session } from '@dchat/shared'

export const sessionApi = {
  create: (title: string, model: string, projectId?: string | null) =>
    apiFetch<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, model, projectId })
    }),

  list: () => apiFetch<Session[]>('/api/sessions'),

  listByProject: (projectId: string) =>
    apiFetch<Session[]>(`/api/sessions?projectId=${encodeURIComponent(projectId)}`),

  get: (id: string) => apiFetch<Session>(`/api/sessions/${id}`),

  delete: (id: string) =>
    apiFetch(`/api/sessions/${id}`, { method: 'DELETE' }),

  updateModel: (id: string, model: string) =>
    apiFetch<Session>(`/api/sessions/${id}/model`, {
      method: 'PATCH',
      body: JSON.stringify({ model })
    }),

  updateTitle: (id: string, title: string) =>
    apiFetch<Session>(`/api/sessions/${id}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    }),

  updateProjectId: (id: string, projectId: string | null) =>
    apiFetch<Session>(`/api/sessions/${id}/project`, {
      method: 'PATCH',
      body: JSON.stringify({ projectId })
    }),

  toggleFavorite: (id: string) =>
    apiFetch<Session>(`/api/sessions/${id}/favorite`, {
      method: 'PATCH'
    })
}
