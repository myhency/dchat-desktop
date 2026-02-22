import { apiFetch } from '@/shared/api/client'
import type { Project } from '@dchat/shared'

export const projectApi = {
  create: (name: string, description: string) =>
    apiFetch<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),

  list: () => apiFetch<Project[]>('/api/projects'),

  delete: (id: string) =>
    apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),

  update: (id: string, name: string, description: string) =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description })
    }),

  updateInstructions: (id: string, instructions: string) =>
    apiFetch<Project>(`/api/projects/${id}/instructions`, {
      method: 'PUT',
      body: JSON.stringify({ instructions })
    }),

  toggleFavorite: (id: string) =>
    apiFetch<Project>(`/api/projects/${id}/favorite`, {
      method: 'PATCH'
    })
}
