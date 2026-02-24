import { apiFetch } from '@/shared/api/client'
import type { MemoryResponse, EditMemoryRequest } from '@dchat/shared'

export const memoryApi = {
  get: () => apiFetch<MemoryResponse>('/api/memory'),
  delete: () => apiFetch<{ ok: boolean }>('/api/memory', { method: 'DELETE' }),
  edit: (body: EditMemoryRequest) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 30_000)
    return apiFetch<MemoryResponse>('/api/memory/edit', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: controller.signal
    })
  }
}
