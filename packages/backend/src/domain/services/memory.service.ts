import type { ManageMemoryUseCase } from '../ports/inbound/manage-memory.usecase'
import type { MessageRepository } from '../ports/outbound/message.repository'
import type { SettingsRepository } from '../ports/outbound/settings.repository'
import type { ProjectRepository } from '../ports/outbound/project.repository'
import type { LLMGatewayResolver } from '../ports/outbound/llm-gateway.resolver'
import type { Message } from '../entities/message'

const CONTENT_MAX = 8000
const MIN_MESSAGES_FOR_EXTRACTION = 4
const RECENT_MESSAGES_COUNT = 10
const SEARCH_RESULT_LIMIT = 10
const MAX_KEYWORDS = 5

const STOP_WORDS = new Set([
  '이', '그', '저', '것', '수', '등', '를', '은', '는', '이', '가', '에', '의', '도', '로', '와', '과',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
  'by', 'from', 'it', 'this', 'that', 'not', 'or', 'and', 'but', 'if', 'so',
  'what', 'which', 'who', 'how', 'when', 'where', 'why', 'all', 'each',
  '있다', '하다', '되다', '없다', '않다', '같다', '보다', '대한', '위해', '통해',
  '해주세요', '알려주세요', '설명해', '무엇', '어떻게', '왜'
])

const EXTRACTION_PROMPT = `You are a memory manager. Analyze the conversation and extract information worth remembering.

Current memory:
{content}

Recent conversation:
{conversation}

Instructions:
- Organize memories into exactly 4 sections: Work context, Personal context, Top of mind, Brief history
- Work context: Professional information — role, projects, tech stack, work preferences
- Personal context: Personal facts — name, location, interests, communication style
- Top of mind: Current focus, ongoing topics, temporary context
- Brief history: Notable past interactions, resolved topics worth remembering
- Merge new information with existing memories, remove outdated info
- If nothing noteworthy, return existing memories unchanged
- Write memories in the same language as the conversation
- Maximum ${CONTENT_MAX} characters total

Respond EXACTLY starting with ## Work context (no extra text before it):
## Work context
(work context here)

## Personal context
(personal context here)

## Top of mind
(top of mind here)

## Brief history
(brief history here)`

const EDIT_PROMPT = `You are a memory editor. Modify the user's memory according to their instruction.

Current memory:
{content}

User instruction:
{instruction}

Instructions:
- Apply the user's instruction to add, modify, or remove information
- Maintain the 4-section structure: Work context, Personal context, Top of mind, Brief history
- Write in the same language as the instruction
- Maximum ${CONTENT_MAX} characters total

Respond EXACTLY starting with ## Work context (no extra text before it):
## Work context
(work context here)

## Personal context
(personal context here)

## Top of mind
(top of mind here)

## Brief history
(brief history here)`

const PROJECT_EXTRACTION_PROMPT = `You are a project memory manager. Analyze the conversation and extract project-specific information worth remembering.

Current project memory:
{project_content}

Global memory (reference only — do NOT duplicate):
{global_content}

Recent conversation:
{conversation}

Instructions:
- Organize into exactly 4 sections: Project goals, Key decisions, Current status, History
- Project goals: Project objectives, requirements, success criteria
- Key decisions: Technical/design decisions, chosen approaches
- Current status: What's being worked on, blockers, next steps
- History: Major milestones, completed features, resolved issues
- Merge new information with existing project memories, remove outdated info
- Do NOT duplicate information already in global memory
- If nothing noteworthy, return existing project memories unchanged
- Write memories in the same language as the conversation
- Maximum ${CONTENT_MAX} characters total

Respond EXACTLY starting with ## Project goals (no extra text before it):
## Project goals
(project goals here)

## Key decisions
(key decisions here)

## Current status
(current status here)

## History
(history here)`

const PROJECT_EDIT_PROMPT = `You are a project memory editor. Modify the project memory according to the user's instruction.

Current project memory:
{project_content}

User instruction:
{instruction}

Instructions:
- Apply the user's instruction to add, modify, or remove information
- Maintain the 4-section structure: Project goals, Key decisions, Current status, History
- Write in the same language as the instruction
- Maximum ${CONTENT_MAX} characters total

Respond EXACTLY starting with ## Project goals (no extra text before it):
## Project goals
(project goals here)

## Key decisions
(key decisions here)

## Current status
(current status here)

## History
(history here)`

export class MemoryService implements ManageMemoryUseCase {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly llmResolver: LLMGatewayResolver,
    private readonly projectRepo?: ProjectRepository
  ) {}

  async getMemory(): Promise<{ content: string; updatedAt: string | null }> {
    const content = await this.settingsRepo.get('memory_content')
    if (content !== null) {
      const updatedAt = await this.settingsRepo.get('memory_updated_at')
      return { content, updatedAt: updatedAt ?? null }
    }

    // Migration: try old format
    const [shortTerm, longTerm, updatedAt] = await Promise.all([
      this.settingsRepo.get('memory_short_term'),
      this.settingsRepo.get('memory_long_term'),
      this.settingsRepo.get('memory_updated_at')
    ])

    if (shortTerm || longTerm) {
      const migrated = this.migrateToSections(shortTerm ?? '', longTerm ?? '')
      await this.settingsRepo.set('memory_content', migrated)
      return { content: migrated, updatedAt: updatedAt ?? null }
    }

    return { content: '', updatedAt: null }
  }

  async deleteMemory(): Promise<void> {
    await Promise.all([
      this.settingsRepo.delete('memory_content'),
      this.settingsRepo.delete('memory_short_term'),
      this.settingsRepo.delete('memory_long_term'),
      this.settingsRepo.delete('memory_updated_at')
    ])
  }

  async editMemory(instruction: string, model: string): Promise<{ content: string; updatedAt: string }> {
    const { content } = await this.getMemory()

    const prompt = EDIT_PROMPT
      .replace('{content}', content || '(empty)')
      .replace('{instruction}', instruction)

    const gateway = this.llmResolver.getGateway(model)
    let result = ''

    const fakeMessages: Message[] = [
      {
        id: 'memory-edit',
        sessionId: 'system',
        role: 'user',
        content: prompt,
        attachments: [],
        createdAt: new Date()
      }
    ]

    for await (const chunk of gateway.streamChat(fakeMessages, {
      model,
      maxTokens: 2000,
      temperature: 0
    })) {
      if (chunk.type === 'text') {
        result += chunk.content
      }
    }

    const parsed = this.parseExtractionResult(result)
    if (!parsed) {
      throw new Error('Failed to parse memory edit result')
    }

    const updatedAt = new Date().toISOString()
    await Promise.all([
      this.settingsRepo.set('memory_content', parsed),
      this.settingsRepo.set('memory_updated_at', updatedAt)
    ])

    return { content: parsed, updatedAt }
  }

  async extractMemory(sessionId: string, model: string): Promise<void> {
    const enabled = await this.settingsRepo.get('memory_enabled')
    if (enabled !== 'true') return

    const messages = await this.messageRepo.findBySessionId(sessionId)
    if (messages.length < MIN_MESSAGES_FOR_EXTRACTION) return

    const recent = messages.slice(-RECENT_MESSAGES_COUNT)
    const { content } = await this.getMemory()

    const conversation = recent
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const prompt = EXTRACTION_PROMPT
      .replace('{content}', content || '(empty)')
      .replace('{conversation}', conversation)

    try {
      const gateway = this.llmResolver.getGateway(model)
      let result = ''

      const fakeMessages: Message[] = [
        {
          id: 'memory-extract',
          sessionId: 'system',
          role: 'user',
          content: prompt,
          attachments: [],
          createdAt: new Date()
        }
      ]

      for await (const chunk of gateway.streamChat(fakeMessages, {
        model,
        maxTokens: 2000,
        temperature: 0
      })) {
        if (chunk.type === 'text') {
          result += chunk.content
        }
      }

      const parsed = this.parseExtractionResult(result)
      if (!parsed) return

      await Promise.all([
        this.settingsRepo.set('memory_content', parsed),
        this.settingsRepo.set('memory_updated_at', new Date().toISOString())
      ])
    } catch (err) {
      console.warn('[memory] Memory extraction failed:', err)
    }
  }

  async buildMemoryContext(query: string, excludeSessionId: string): Promise<string> {
    const parts: string[] = []

    // Memory section
    const { content } = await this.getMemory()
    if (content) {
      parts.push(`<memory>\n${content}\n</memory>`)
    }

    // Chat search section
    const searchEnabled = await this.settingsRepo.get('chat_search_enabled')
    if (searchEnabled === 'true' && query) {
      const keywords = this.extractKeywords(query)
      if (keywords.length > 0) {
        const results = await this.messageRepo.searchByKeywords(keywords, excludeSessionId, SEARCH_RESULT_LIMIT)
        if (results.length > 0) {
          const formatted = results
            .map((m) => `[${m.role}] ${m.content}`)
            .join('\n---\n')
          parts.push(`<relevant_past_conversations>\n${formatted}\n</relevant_past_conversations>`)
        }
      }
    }

    return parts.join('\n\n')
  }

  // ── Project Memory ──

  async getProjectMemory(projectId: string): Promise<{ content: string; updatedAt: string | null }> {
    if (!this.projectRepo) throw new Error('ProjectRepository not configured')
    const project = await this.projectRepo.findById(projectId)
    if (!project) throw new Error(`Project not found: ${projectId}`)
    return {
      content: project.memoryContent,
      updatedAt: project.memoryUpdatedAt?.toISOString() ?? null
    }
  }

  async deleteProjectMemory(projectId: string): Promise<void> {
    if (!this.projectRepo) throw new Error('ProjectRepository not configured')
    const project = await this.projectRepo.findById(projectId)
    if (!project) throw new Error(`Project not found: ${projectId}`)
    project.memoryContent = ''
    project.memoryUpdatedAt = null
    await this.projectRepo.save(project)
  }

  async editProjectMemory(projectId: string, instruction: string, model: string): Promise<{ content: string; updatedAt: string }> {
    if (!this.projectRepo) throw new Error('ProjectRepository not configured')
    const project = await this.projectRepo.findById(projectId)
    if (!project) throw new Error(`Project not found: ${projectId}`)

    const prompt = PROJECT_EDIT_PROMPT
      .replace('{project_content}', project.memoryContent || '(empty)')
      .replace('{instruction}', instruction)

    const gateway = this.llmResolver.getGateway(model)
    let result = ''

    const fakeMessages: Message[] = [
      {
        id: 'project-memory-edit',
        sessionId: 'system',
        role: 'user',
        content: prompt,
        attachments: [],
        createdAt: new Date()
      }
    ]

    for await (const chunk of gateway.streamChat(fakeMessages, {
      model,
      maxTokens: 2000,
      temperature: 0
    })) {
      if (chunk.type === 'text') {
        result += chunk.content
      }
    }

    const parsed = this.parseExtractionResult(result)
    if (!parsed) {
      throw new Error('Failed to parse project memory edit result')
    }

    const updatedAt = new Date().toISOString()
    project.memoryContent = parsed
    project.memoryUpdatedAt = new Date(updatedAt)
    await this.projectRepo.save(project)

    return { content: parsed, updatedAt }
  }

  async extractProjectMemory(projectId: string, sessionId: string, model: string): Promise<void> {
    if (!this.projectRepo) return
    const enabled = await this.settingsRepo.get('memory_enabled')
    if (enabled !== 'true') return

    const project = await this.projectRepo.findById(projectId)
    if (!project) return

    const messages = await this.messageRepo.findBySessionId(sessionId)
    if (messages.length < MIN_MESSAGES_FOR_EXTRACTION) return

    const recent = messages.slice(-RECENT_MESSAGES_COUNT)
    const { content: globalContent } = await this.getMemory()

    const conversation = recent
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const prompt = PROJECT_EXTRACTION_PROMPT
      .replace('{project_content}', project.memoryContent || '(empty)')
      .replace('{global_content}', globalContent || '(empty)')
      .replace('{conversation}', conversation)

    try {
      const gateway = this.llmResolver.getGateway(model)
      let result = ''

      const fakeMessages: Message[] = [
        {
          id: 'project-memory-extract',
          sessionId: 'system',
          role: 'user',
          content: prompt,
          attachments: [],
          createdAt: new Date()
        }
      ]

      for await (const chunk of gateway.streamChat(fakeMessages, {
        model,
        maxTokens: 2000,
        temperature: 0
      })) {
        if (chunk.type === 'text') {
          result += chunk.content
        }
      }

      const parsed = this.parseExtractionResult(result)
      if (!parsed) return

      project.memoryContent = parsed
      project.memoryUpdatedAt = new Date()
      await this.projectRepo.save(project)
    } catch (err) {
      console.warn('[memory] Project memory extraction failed:', err)
    }
  }

  async buildProjectMemoryContext(projectId: string): Promise<string> {
    if (!this.projectRepo) return ''
    const project = await this.projectRepo.findById(projectId)
    if (!project || !project.memoryContent) return ''
    return `<project_memory>\n${project.memoryContent}\n</project_memory>`
  }

  parseExtractionResult(raw: string): string | null {
    // Must contain at least one ## header
    if (!raw.includes('## ')) return null

    // Strip any text before the first ## header
    const idx = raw.indexOf('## ')
    const trimmed = raw.slice(idx).trim()

    // Apply max length
    return trimmed.slice(0, CONTENT_MAX)
  }

  private migrateToSections(shortTerm: string, longTerm: string): string {
    const sections: string[] = []
    sections.push('## Work context')
    if (longTerm) sections.push(longTerm)
    sections.push('')
    sections.push('## Personal context')
    sections.push('')
    sections.push('## Top of mind')
    if (shortTerm) sections.push(shortTerm)
    sections.push('')
    sections.push('## Brief history')
    return sections.join('\n')
  }

  extractKeywords(text: string): string[] {
    const words = text
      .replace(/[^\w\sㄱ-힣]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w.toLowerCase()))

    // Deduplicate and limit
    const unique = Array.from(new Set(words.map((w) => w.toLowerCase())))
    return unique.slice(0, MAX_KEYWORDS)
  }
}
