import { apiFetch } from '@/shared/api/client'
import type { MemoryResponse } from '@dchat/shared'

export const memoryApi = {
  get: () => apiFetch<MemoryResponse>('/api/memory')
}
