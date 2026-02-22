import type { LLMGateway } from './llm.gateway'
import type { ModelInfo } from '../../entities/model-info'

export interface LLMGatewayResolver {
  getGateway(model: string): LLMGateway
  listAllModels(): ModelInfo[]
  configureProvider(provider: 'anthropic' | 'openai', apiKey: string, baseURL?: string): void
  testConnection(provider: 'anthropic' | 'openai'): Promise<void>
}
