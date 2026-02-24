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
      delete: vi.fn(async (key: string) => { delete settingsStore[key] }),
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

    expect(settingsRepo.set).not.toHaveBeenCalledWith('memory_content', expect.any(String))
  })

  it('extractMemory: LLM 출력 파싱 + settings 저장', async () => {
    settingsStore['memory_enabled'] = 'true'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(6))

    const llmResponse = `## Work context
사용자가 React 프로젝트에 대해 작업 중

## Personal context
사용자 이름: 홍길동, 프론트엔드 개발자

## Top of mind
현재 메모리 기능 개발 중

## Brief history
이전에 채팅 검색 기능 구현`

    llmResolver.getGateway = () => createMockGateway(llmResponse)
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsStore['memory_content']).toContain('## Work context')
    expect(settingsStore['memory_content']).toContain('홍길동')
    expect(settingsStore['memory_updated_at']).toBeTruthy()
  })

  it('extractMemory: 사이즈 제한 적용 (max 8000자)', async () => {
    settingsStore['memory_enabled'] = 'true'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(6))

    const longContent = 'x'.repeat(10000)
    const llmResponse = `## Work context
${longContent}

## Personal context

## Top of mind

## Brief history`

    llmResolver.getGateway = () => createMockGateway(llmResponse)
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsStore['memory_content']!.length).toBeLessThanOrEqual(8000)
  })

  it('extractMemory: 파싱 실패 시 기존 메모리 유지', async () => {
    settingsStore['memory_enabled'] = 'true'
    settingsStore['memory_content'] = '## Work context\n기존 메모리'
    messageRepo.findBySessionId = vi.fn(async () => createMockMessages(6))

    // Invalid format response
    llmResolver.getGateway = () => createMockGateway('잘못된 포맷 응답')
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await memoryService.extractMemory('s1', 'claude-haiku-4-5')

    expect(settingsStore['memory_content']).toBe('## Work context\n기존 메모리')
  })

  // ── buildMemoryContext ──

  it('buildMemoryContext: disabled일 때 검색 결과 없음', async () => {
    settingsStore['chat_search_enabled'] = 'false'
    settingsStore['memory_content'] = '## Work context\n프론트엔드 개발자\n\n## Top of mind\n현재 작업 중'

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
    settingsStore['memory_content'] = '## Work context\n프론트엔드 개발자\n\n## Top of mind\n현재 React 작업 중'

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

  it('buildMemoryContext: 단일 <memory> 블록으로 출력', async () => {
    settingsStore['memory_content'] = '## Work context\n개발자\n\n## Personal context\n홍길동'

    const result = await memoryService.buildMemoryContext('', 's1')

    expect(result).toBe('<memory>\n## Work context\n개발자\n\n## Personal context\n홍길동\n</memory>')
  })

  // ── parseExtractionResult ──

  it('parseExtractionResult: 4섹션 문서 파싱', () => {
    const raw = `## Work context
작업 내용

## Personal context
개인 정보

## Top of mind
현재 관심사

## Brief history
과거 기록`

    const result = memoryService.parseExtractionResult(raw)
    expect(result).toContain('## Work context')
    expect(result).toContain('작업 내용')
    expect(result).toContain('## Brief history')
  })

  it('parseExtractionResult: ## 헤더 이전 텍스트 제거', () => {
    const raw = `Here is the updated memory:

## Work context
작업 내용

## Personal context
개인 정보`

    const result = memoryService.parseExtractionResult(raw)
    expect(result).not.toContain('Here is')
    expect(result!.startsWith('## Work context')).toBe(true)
  })

  it('parseExtractionResult: 잘못된 포맷 시 null 반환', () => {
    expect(memoryService.parseExtractionResult('잘못된 포맷')).toBeNull()
    expect(memoryService.parseExtractionResult('헤더 없는 텍스트')).toBeNull()
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

  it('getMemory: memory_content 키에서 반환', async () => {
    settingsStore['memory_content'] = '## Work context\n개발자'
    settingsStore['memory_updated_at'] = '2024-01-01T00:00:00.000Z'

    const result = await memoryService.getMemory()

    expect(result).toEqual({
      content: '## Work context\n개발자',
      updatedAt: '2024-01-01T00:00:00.000Z'
    })
  })

  it('getMemory: 빈 상태 반환', async () => {
    const result = await memoryService.getMemory()

    expect(result).toEqual({
      content: '',
      updatedAt: null
    })
  })

  it('getMemory: 이전 포맷(short_term/long_term) → 자동 마이그레이션', async () => {
    settingsStore['memory_short_term'] = '현재 React 작업 중'
    settingsStore['memory_long_term'] = '프론트엔드 개발자'
    settingsStore['memory_updated_at'] = '2024-01-01T00:00:00.000Z'

    const result = await memoryService.getMemory()

    expect(result.content).toContain('## Work context')
    expect(result.content).toContain('프론트엔드 개발자')
    expect(result.content).toContain('## Top of mind')
    expect(result.content).toContain('현재 React 작업 중')
    expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z')
    // 마이그레이션 후 memory_content에 저장
    expect(settingsStore['memory_content']).toContain('## Work context')
  })

  // ── deleteMemory ──

  it('deleteMemory: 모든 메모리 키 삭제', async () => {
    settingsStore['memory_content'] = '## Work context\n내용'
    settingsStore['memory_short_term'] = '단기'
    settingsStore['memory_long_term'] = '장기'
    settingsStore['memory_updated_at'] = '2024-01-01T00:00:00.000Z'

    await memoryService.deleteMemory()

    expect(settingsStore['memory_content']).toBeUndefined()
    expect(settingsStore['memory_short_term']).toBeUndefined()
    expect(settingsStore['memory_long_term']).toBeUndefined()
    expect(settingsStore['memory_updated_at']).toBeUndefined()
  })

  // ── editMemory ──

  it('editMemory: LLM 호출 → memory_content 저장', async () => {
    settingsStore['memory_content'] = '## Work context\n기존 내용\n\n## Personal context\n\n## Top of mind\n\n## Brief history'

    const editResponse = `## Work context
기존 내용

## Personal context
프론트엔드 개발자

## Top of mind

## Brief history`

    llmResolver.getGateway = () => createMockGateway(editResponse)
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    const result = await memoryService.editMemory('나는 프론트엔드 개발자야', 'claude-haiku-4-5')

    expect(result.content).toContain('프론트엔드 개발자')
    expect(result.updatedAt).toBeTruthy()
    expect(settingsStore['memory_content']).toContain('프론트엔드 개발자')
  })

  it('editMemory: 파싱 실패 시 에러 throw', async () => {
    llmResolver.getGateway = () => createMockGateway('잘못된 응답')
    memoryService = new MemoryService(messageRepo, settingsRepo, llmResolver)

    await expect(memoryService.editMemory('테스트', 'claude-haiku-4-5')).rejects.toThrow('Failed to parse memory edit result')
  })
})
