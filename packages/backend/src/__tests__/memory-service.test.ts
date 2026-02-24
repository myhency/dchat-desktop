/**
 * MemoryService 단위 테스트 — mock ports
 *
 * 메모리 추출, 검색, 컨텍스트 빌드 로직 검증.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryService } from '../domain/services/memory.service'
import type { Message } from '../domain/entities/message'
import type { MessageRepository } from '../domain/ports/outbound/message.repository'
import type { SettingsRepository } from '../domain/ports/outbound/settings.repository'
import type { LLMGatewayResolver } from '../domain/ports/outbound/llm-gateway.resolver'
import type { LLMGateway, StreamChunk, ChatOptions } from '../domain/ports/outbound/llm.gateway'

// ── Helpers ──

function createMockMessages(count: number, sessionId = 's1'): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    sessionId,
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `message ${i}`,
    attachments: [],
    createdAt: new Date(Date.now() - (count - i) * 60_000)
  }))
}

function createMockGateway(response: string): LLMGateway {
  return {
    async *streamChat(_messages: Message[], _options: ChatOptions) {
      yield { type: 'text' as const, content: response }
      yield { type: 'done' as const, content: '' }
    },
    listModels: () => []
  }
}

// ── Tests ──

describe('MemoryService', () => {
  let messageRepo: MessageRepository
  let settingsRepo: SettingsRepository
  let llmResolver: LLMGatewayResolver
  let memoryService: MemoryService
  let settingsStore: Record<string, string>

  beforeEach(() => {
    settingsStore = {}

    messageRepo = {
      findBySessionId: vi.fn(async () => []),
      searchByKeywords: vi.fn(async () => []),
      save: vi.fn(async () => {}),
      updateContent: vi.fn(async () => {}),
      deleteById: vi.fn(async () => {}),
      deleteBySessionId: vi.fn(async () => {}),
      deleteAll: vi.fn(async () => {})
    }

    settingsRepo = {
      get: vi.fn(async (key: string) => settingsStore[key] ?? null),
      set: vi.fn(async (key: string, value: string) => { settingsStore[key] = value }),
      delete: vi.fn(async () => {}),
      getAll: vi.fn(async () => settingsStore),
      deleteAll: vi.fn(async () => {})
    }

    llmResolver = {
      getGateway: () => createMockGateway(''),
      listAllModels: () => [],
      configureProvider: () => {},
      testConnection: async () => {}
    }

    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)
  })

  // ── extractMemory ──

  it('extractMemory: disabled일 때 skip', async () => {
    settingsStore['memory_enabled'] = 'false'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(10))

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(messageRepo.findBySessionId).not.toHaveBeenCalled()
  })

  it('extractMemory: memory_enabled 미설정 시 skip', async () => {
    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(messageRepo.findBySessionId).not.toHaveBeenCalled()
  })

  it('extractMemory: 히스토리 부족 시 skip (4개 미만)', async () => {
    settingsStore['memory_enabled'] = 'true'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(3))

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsRepo.set).not.toHaveBeenCalledWith('memory_short_term', expect.any(String))
  })

  it('extractMemory: LLM 출력 파싱 + settings 저장', async () => {
    settingsStore['memory_enabled'] = 'true'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(6))

    const llmResponse = `---SHORT_TERM---
사용자가 React 프로젝트에 대해 작업 중
---LONG_TERM---
사용자 이름: 홍길동, 프론트엔드 개발자
---END---`

    llmResolver.getGateway = () => createMockGateway(llmResponse)
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsStore['memory_short_term']).toBe('사용자가 React 프로젝트에 대해 작업 중')
    expect(settingsStore['memory_long_term']).toBe('사용자 이름: 홍길동, 프론트엔드 개발자')
    expect(settingsStore['memory_updated_at']).toBeTruthy()
  })

  it('extractMemory: 사이즈 제한 적용', async () => {
    settingsStore['memory_enabled'] = 'true'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(6))

    const longContent = 'x'.repeat(10000)
    const llmResponse = `---SHORT_TERM---
${longContent}
---LONG_TERM---
${longContent}
---END---`

    llmResolver.getGateway = () => createMockGateway(llmResponse)
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsStore['memory_short_term']!.length).toBeLessThanOrEqual(2000)
    expect(settingsStore['memory_long_term']!.length).toBeLessThanOrEqual(5000)
  })

  it('extractMemory: 파싱 실패 시 기존 메모리 유지', async () => {
    settingsStore['memory_enabled'] = 'true'
    settingsStore['memory_short_term'] = '기존 단기 메모리'
    settingsStore['memory_long_term'] = '기존 장기 메모리'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(6))

    // Invalid format response
    llmResolver.getGateway = () => createMockGateway('잘못된 포맷 응답')
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsStore['memory_short_term']).toBe('기존 단기 메모리')
    expect(settingsStore['memory_long_term']).toBe('기존 장기 메모리')
  })

  // ── buildMemoryContext ──

  it('buildMemoryContext: disabled일 때 검색 결과 없음', async () => {
    settingsStore['chat_search_enabled'] = 'false'
    settingsStore['memory_short_term'] = '단기'
    settingsStore['memory_long_term'] = '장기'

    const result = await memoryService.buildMemoryContext('테스트 검색어', 's1')

    // 메모리 섹션은 있지만 검색 섹션은 없음
    expect(result).toContain('<memory>')
    expect(result).not.toContain('<relevant_past_conversations>')
  })

  it('buildMemoryContext: 검색 활성화 시 키워드 추출 + 포맷', async () => {
    settingsStore['chat_search_enabled'] = 'true'
    const searchResults: Message[] = [
      {
        id: 'r1',
        sessionId: 's2',
        role: 'user',
        content: 'React 컴포넌트 질문',
        attachments: [],
        createdAt: new Date()
      },
      {
        id: 'r2',
        sessionId: 's2',
        role: 'assistant',
        content: 'React 컴포넌트는...',
        attachments: [],
        createdAt: new Date()
      }
    ]
    messageRepo.searchByKeywords = vi.fn(async () => searchResults)

    const result = await memoryService.buildMemoryContext('React 컴포넌트에 대해 알려줘', 's1')

    expect(result).toContain('<relevant_past_conversations>')
    expect(result).toContain('React 컴포넌트 질문')
    expect(messageRepo.searchByKeywords).toHaveBeenCalled()
  })

  it('buildMemoryContext: 메모리 + 검색 결과 결합', async () => {
    settingsStore['chat_search_enabled'] = 'true'
    settingsStore['memory_short_term'] = '현재 React 작업 중'
    settingsStore['memory_long_term'] = '프론트엔드 개발자'

    const searchResults: Message[] = [
      {
        id: 'r1',
        sessionId: 's2',
        role: 'assistant',
        content: '이전 대화 내용',
        attachments: [],
        createdAt: new Date()
      }
    ]
    messageRepo.searchByKeywords = vi.fn(async () => searchResults)

    const result = await memoryService.buildMemoryContext('React 프로젝트 진행', 's1')

    expect(result).toContain('<memory>')
    expect(result).toContain('프론트엔드 개발자')
    expect(result).toContain('현재 React 작업 중')
    expect(result).toContain('<relevant_past_conversations>')
  })

  // ── parseExtractionResult ──

  it('parseExtractionResult: 올바른 포맷 파싱', () => {
    const raw = `---SHORT_TERM---
단기 내용
---LONG_TERM---
장기 내용
---END---`

    const result = memoryService.parseExtractionResult(raw)
    expect(result).toEqual({
      shortTerm: '단기 내용',
      longTerm: '장기 내용'
    })
  })

  it('parseExtractionResult: 잘못된 포맷 시 null 반환', () => {
    expect(memoryService.parseExtractionResult('잘못된 포맷')).toBeNull()
    expect(memoryService.parseExtractionResult('---SHORT_TERM--- 내용만')).toBeNull()
  })

  // ── extractKeywords ──

  it('extractKeywords: 불용어 제거 + 2글자 이상 필터', () => {
    const keywords = memoryService.extractKeywords('React 컴포넌트 설명해 주세요')
    expect(keywords).toContain('react')
    expect(keywords).toContain('컴포넌트')
    // 불용어 '설명해' 제거
    expect(keywords).not.toContain('설명해')
  })

  it('extractKeywords: 최대 5개 제한', () => {
    const keywords = memoryService.extractKeywords(
      'React TypeScript JavaScript Node Express MongoDB PostgreSQL Redis'
    )
    expect(keywords.length).toBeLessThanOrEqual(5)
  })

  it('extractKeywords: 중복 제거', () => {
    const keywords = memoryService.extractKeywords('React react REACT component')
    const reactCount = keywords.filter((k) => k === 'react').length
    expect(reactCount).toBe(1)
  })

  // ── getMemory ──

  it('getMemory: 저장된 메모리 반환', async () => {
    settingsStore['memory_short_term'] = '단기 기억'
    settingsStore['memory_long_term'] = '장기 기억'
    settingsStore['memory_updated_at'] = '2024-01-01T00:00:00.000Z'

    const result = await memoryService.getMemory()

    expect(result).toEqual({
      shortTerm: '단기 기억',
      longTerm: '장기 기억',
      updatedAt: '2024-01-01T00:00:00.000Z'
    })
  })

  it('getMemory: 빈 상태 반환', async () => {
    const result = await memoryService.getMemory()

    expect(result).toEqual({
      shortTerm: '',
      longTerm: '',
      updatedAt: null
    })
  })
})
