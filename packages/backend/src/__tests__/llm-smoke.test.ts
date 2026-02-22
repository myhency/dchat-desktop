/**
 * L1. LLM 어댑터 스모크 테스트 — 실제 Anthropic API 호출
 *
 * ANTHROPIC_API_KEY 환경변수가 없으면 전체 skip.
 * 모델: claude-haiku-4-5 (가장 빠르고 저렴)
 */

import { describe, it, expect } from 'vitest'
import { AnthropicAdapter } from '../adapters/outbound/llm/anthropic.adapter'
import type { Message } from '../domain/entities/message'
import type { StreamChunk } from '../domain/ports/outbound/llm.gateway'

const API_KEY = process.env.ANTHROPIC_API_KEY

describe.skipIf(!API_KEY)('AnthropicAdapter smoke test', () => {
  it('should stream a response with text and done chunks', async () => {
    const adapter = new AnthropicAdapter(API_KEY!)
    const messages: Message[] = [
      {
        id: '1',
        sessionId: 's1',
        role: 'user',
        content: 'Say "hello" and nothing else.',
        attachments: [],
        createdAt: new Date()
      }
    ]

    const chunks: StreamChunk[] = []
    for await (const chunk of adapter.streamChat(messages, { model: 'claude-haiku-4-5' })) {
      chunks.push(chunk)
    }

    // text chunk가 1개 이상
    const textChunks = chunks.filter((c) => c.type === 'text')
    expect(textChunks.length).toBeGreaterThan(0)

    // done chunk가 마지막
    expect(chunks.at(-1)?.type).toBe('done')

    // 합쳐진 content가 비어있지 않음
    const fullContent = textChunks.map((c) => c.content).join('')
    expect(fullContent.trim()).not.toBe('')
  }, 30_000)

  it('should list models', () => {
    const adapter = new AnthropicAdapter(API_KEY!)
    const models = adapter.listModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models.some((m) => m.provider === 'anthropic')).toBe(true)
  })
})
