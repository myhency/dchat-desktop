import type { LLMGateway } from '../../../domain/ports/outbound/llm.gateway'
import type { ModelInfo } from '../../../domain/entities/model-info'
import type { LLMGatewayResolver } from '../../../domain/ports/outbound/llm-gateway.resolver'
import { AnthropicAdapter } from './anthropic.adapter'
import { OpenAIAdapter } from './openai.adapter'

export class LLMAdapterFactory implements LLMGatewayResolver {
  private anthropicAdapter: AnthropicAdapter | null = null
  private openaiAdapter: OpenAIAdapter | null = null

  setAnthropicKey(apiKey: string, baseURL?: string): void {
    this.anthropicAdapter = new AnthropicAdapter(apiKey, baseURL)
  }

  setOpenAIKey(apiKey: string, baseURL?: string): void {
    this.openaiAdapter = new OpenAIAdapter(apiKey, baseURL)
  }

  async testConnection(provider: 'anthropic' | 'openai'): Promise<void> {
    if (provider === 'anthropic') {
      if (!this.anthropicAdapter) throw new Error('Anthropic API key not configured')
      await this.anthropicAdapter.testConnection()
    } else {
      if (!this.openaiAdapter) throw new Error('OpenAI API key not configured')
      await this.openaiAdapter.testConnection()
    }
  }

  getGateway(model: string): LLMGateway {
    if (model.startsWith('claude-')) {
      if (!this.anthropicAdapter) {
        throw new Error('Anthropic API key not configured')
      }
      return this.anthropicAdapter
    }

    if (model.startsWith('gpt-') || model.startsWith('o3')) {
      if (!this.openaiAdapter) {
        throw new Error('OpenAI API key not configured')
      }
      return this.openaiAdapter
    }

    throw new Error(`Unknown model: ${model}`)
  }

  listAllModels(): ModelInfo[] {
    const models: ModelInfo[] = []

    if (this.anthropicAdapter) {
      models.push(...this.anthropicAdapter.listModels())
    }

    if (this.openaiAdapter) {
      models.push(...this.openaiAdapter.listModels())
    }

    return models
  }
}
