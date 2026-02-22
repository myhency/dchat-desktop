import { apiFetch } from './client'
import type { ModelInfo } from '@dchat/shared'

export const modelsApi = {
  list: () => apiFetch<ModelInfo[]>('/api/models')
}
