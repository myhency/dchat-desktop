import { describe, it, expect } from 'vitest'
import { getShortName, getDescription, MODEL_META } from './model-meta'

describe('getShortName', () => {
  it('returns shortName for known models', () => {
    expect(getShortName('claude-opus-4-6')).toBe('Opus 4.6')
    expect(getShortName('gpt-4o')).toBe('GPT-4o')
  })

  it('returns modelId for unknown models', () => {
    expect(getShortName('unknown-model-xyz')).toBe('unknown-model-xyz')
  })

  it('covers all entries in MODEL_META', () => {
    for (const [modelId, meta] of Object.entries(MODEL_META)) {
      expect(getShortName(modelId)).toBe(meta.shortName)
    }
  })
})

describe('getDescription', () => {
  it('returns description for known models', () => {
    expect(getDescription('claude-opus-4-6')).toBe('Most capable model for complex tasks')
    expect(getDescription('gpt-4o-mini')).toBe('Fast and cost-effective')
  })

  it('returns empty string for unknown models', () => {
    expect(getDescription('unknown-model-xyz')).toBe('')
  })

  it('covers all entries in MODEL_META', () => {
    for (const [modelId, meta] of Object.entries(MODEL_META)) {
      expect(getDescription(modelId)).toBe(meta.description)
    }
  })
})
