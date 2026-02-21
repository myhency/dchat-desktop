interface ModelMeta {
  shortName: string
  description: string
}

export const MODEL_META: Record<string, ModelMeta> = {
  'claude-opus-4-6': {
    shortName: 'Opus 4.6',
    description: 'Most capable model for complex tasks'
  },
  'claude-sonnet-4-6': {
    shortName: 'Sonnet 4.6',
    description: 'Balanced speed and intelligence'
  },
  'claude-haiku-4-5': {
    shortName: 'Haiku 4.5',
    description: 'Fastest response times'
  },
  'gpt-4o': {
    shortName: 'GPT-4o',
    description: 'OpenAI flagship model'
  },
  'gpt-4o-mini': {
    shortName: 'GPT-4o Mini',
    description: 'Fast and cost-effective'
  }
}

export function getShortName(modelId: string): string {
  return MODEL_META[modelId]?.shortName ?? modelId
}

export function getDescription(modelId: string): string {
  return MODEL_META[modelId]?.description ?? ''
}
