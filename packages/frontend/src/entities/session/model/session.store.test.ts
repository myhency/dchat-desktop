import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Message } from '@dchat/shared'
import type { Session } from './session.store'

// Mock external dependencies before importing the store
vi.mock('../api/chat.api', () => ({
  chatApi: {
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    stopStream: vi.fn()
  }
}))

vi.mock('../api/session.api', () => ({
  sessionApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateTitle: vi.fn(),
    updateModel: vi.fn(),
    toggleFavorite: vi.fn(),
    updateProjectId: vi.fn()
  }
}))

vi.mock('@/entities/project', () => ({
  useProjectStore: { getState: () => ({ deselectProject: vi.fn() }) }
}))

vi.mock('@/entities/settings', () => ({
  useSettingsStore: { setState: vi.fn() }
}))

import { useSessionStore } from './session.store'
import { chatApi } from '../api/chat.api'
import { sessionApi } from '../api/session.api'

const mockChatApi = vi.mocked(chatApi)
const mockSessionApi = vi.mocked(sessionApi)

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    title: 'Test Session',
    model: 'claude-opus-4-6',
    projectId: null,
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    role: 'user',
    content: 'Hello',
    attachments: [],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function resetStore() {
  useSessionStore.setState({
    sessions: [],
    currentSessionId: null,
    messages: [],
    streamingSessionIds: new Set(),
    streamingSegments: {},
    error: null,
    searchOpen: false,
    allChatsOpen: false,
    projectsOpen: false,
    artifactPanel: null
  })
}

describe('session store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  describe('sendMessage', () => {
    it('does nothing when currentSessionId is null', async () => {
      await useSessionStore.getState().sendMessage('Hello')
      expect(mockChatApi.sendMessage).not.toHaveBeenCalled()
    })

    it('adds optimistic user message and enters streaming state', async () => {
      const controller = new AbortController()
      mockChatApi.sendMessage.mockReturnValue(controller)

      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: []
      })

      await useSessionStore.getState().sendMessage('Hello')

      const state = useSessionStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].role).toBe('user')
      expect(state.messages[0].content).toBe('Hello')
      expect(state.messages[0].sessionId).toBe('sess-1')
      expect(state.streamingSessionIds.has('sess-1')).toBe(true)
      expect(state.streamingSegments['sess-1']).toEqual([])
    })

    it('passes attachments to the optimistic message', async () => {
      const controller = new AbortController()
      mockChatApi.sendMessage.mockReturnValue(controller)

      useSessionStore.setState({ currentSessionId: 'sess-1', messages: [] })

      const attachments = [{ id: 'att-1', fileName: 'test.png', mimeType: 'image/png', base64Data: 'base64data' }]
      await useSessionStore.getState().sendMessage('Look at this', attachments)

      const state = useSessionStore.getState()
      expect(state.messages[0].attachments).toEqual(attachments)
    })
  })

  describe('editMessage', () => {
    it('removes messages after the edited one and updates content', async () => {
      const controller = new AbortController()
      mockChatApi.editMessage.mockReturnValue(controller)

      const msg1 = makeMessage({ id: 'msg-1', role: 'user', content: 'Original' })
      const msg2 = makeMessage({ id: 'msg-2', role: 'assistant', content: 'Response' })
      const msg3 = makeMessage({ id: 'msg-3', role: 'user', content: 'Follow-up' })

      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: [msg1, msg2, msg3]
      })

      await useSessionStore.getState().editMessage('msg-1', 'Edited content')

      const state = useSessionStore.getState()
      // Only msg-1 remains (index 0), subsequent messages removed
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('Edited content')
      expect(state.messages[0].id).toBe('msg-1')
      expect(state.streamingSessionIds.has('sess-1')).toBe(true)
    })

    it('does nothing when currentSessionId is null', async () => {
      await useSessionStore.getState().editMessage('msg-1', 'Edited')
      expect(mockChatApi.editMessage).not.toHaveBeenCalled()
    })

    it('does nothing when messageId is not found', async () => {
      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: [makeMessage({ id: 'msg-1' })]
      })

      await useSessionStore.getState().editMessage('nonexistent', 'Edited')
      expect(mockChatApi.editMessage).not.toHaveBeenCalled()
    })
  })

  describe('stopStream', () => {
    it('creates synthetic assistant message from streaming segments', () => {
      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: [makeMessage()],
        streamingSessionIds: new Set(['sess-1']),
        streamingSegments: { 'sess-1': [{ type: 'text', content: 'Partial response' }] }
      })

      useSessionStore.getState().stopStream()

      const state = useSessionStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[1].role).toBe('assistant')
      expect(state.messages[1].content).toBe('Partial response')
      expect(state.streamingSessionIds.has('sess-1')).toBe(false)
      expect(state.streamingSegments['sess-1']).toBeUndefined()
      expect(mockChatApi.stopStream).toHaveBeenCalledWith('sess-1', 'Partial response')
    })

    it('does not add message when streaming segments have no text', () => {
      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: [makeMessage()],
        streamingSessionIds: new Set(['sess-1']),
        streamingSegments: { 'sess-1': [] }
      })

      useSessionStore.getState().stopStream()

      const state = useSessionStore.getState()
      expect(state.messages).toHaveLength(1) // no new message added
      expect(state.streamingSessionIds.has('sess-1')).toBe(false)
    })

    it('does nothing when currentSessionId is null', () => {
      useSessionStore.getState().stopStream()
      expect(mockChatApi.stopStream).not.toHaveBeenCalled()
    })
  })

  describe('deleteSession', () => {
    it('selects next session when deleting current session', async () => {
      const sess1 = makeSession({ id: 'sess-1' })
      const sess2 = makeSession({ id: 'sess-2', title: 'Second' })
      const msgs = [makeMessage({ id: 'msg-a', sessionId: 'sess-2' })]

      mockSessionApi.delete.mockResolvedValue(undefined as any)
      mockChatApi.getMessages.mockResolvedValue(msgs)

      useSessionStore.setState({
        sessions: [sess1, sess2],
        currentSessionId: 'sess-1',
        messages: []
      })

      await useSessionStore.getState().deleteSession('sess-1')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.sessions[0].id).toBe('sess-2')
      expect(state.currentSessionId).toBe('sess-2')
      expect(mockChatApi.getMessages).toHaveBeenCalledWith('sess-2')
    })

    it('clears everything when deleting the only session', async () => {
      const sess1 = makeSession({ id: 'sess-1' })
      mockSessionApi.delete.mockResolvedValue(undefined as any)

      useSessionStore.setState({
        sessions: [sess1],
        currentSessionId: 'sess-1',
        messages: [makeMessage()]
      })

      await useSessionStore.getState().deleteSession('sess-1')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(0)
      expect(state.currentSessionId).toBeNull()
      expect(state.messages).toHaveLength(0)
    })

    it('keeps currentSessionId when deleting a non-current session', async () => {
      const sess1 = makeSession({ id: 'sess-1' })
      const sess2 = makeSession({ id: 'sess-2' })
      mockSessionApi.delete.mockResolvedValue(undefined as any)

      useSessionStore.setState({
        sessions: [sess1, sess2],
        currentSessionId: 'sess-1',
        messages: [makeMessage()]
      })

      await useSessionStore.getState().deleteSession('sess-2')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.currentSessionId).toBe('sess-1')
    })
  })

  describe('selectSession', () => {
    it('loads messages and sets currentSessionId', async () => {
      const msgs = [makeMessage({ sessionId: 'sess-2' })]
      mockChatApi.getMessages.mockResolvedValue(msgs)

      await useSessionStore.getState().selectSession('sess-2')

      const state = useSessionStore.getState()
      expect(state.currentSessionId).toBe('sess-2')
      expect(state.messages).toEqual(msgs)
      expect(state.error).toBeNull()
      expect(state.allChatsOpen).toBe(false)
      expect(state.projectsOpen).toBe(false)
      expect(state.artifactPanel).toBeNull()
    })
  })

  describe('streamingSegments chronological order', () => {
    it('produces text → tool → text segments in order', async () => {
      let callbacks: any = {}
      mockChatApi.sendMessage.mockImplementation((_sid, _content, _imgs, cbs) => {
        callbacks = cbs
        return new AbortController()
      })

      useSessionStore.setState({ currentSessionId: 'sess-1', messages: [] })
      await useSessionStore.getState().sendMessage('Hello')

      // Simulate: text chunk → tool use → text chunk
      callbacks.onChunk('Before tool. ')
      callbacks.onToolUse({ toolUseId: 'tu-1', toolName: 'read_file', toolInput: { path: '/a' } })
      callbacks.onChunk('After tool.')

      const segments = useSessionStore.getState().streamingSegments['sess-1']
      expect(segments).toHaveLength(3)
      expect(segments[0]).toEqual({ type: 'text', content: 'Before tool. ' })
      expect(segments[1]).toEqual({
        type: 'tool',
        toolCall: { toolUseId: 'tu-1', toolName: 'read_file', toolInput: { path: '/a' }, status: 'calling' }
      })
      expect(segments[2]).toEqual({ type: 'text', content: 'After tool.' })
    })

    it('consecutive text chunks merge into a single text segment', async () => {
      let callbacks: any = {}
      mockChatApi.sendMessage.mockImplementation((_sid, _content, _imgs, cbs) => {
        callbacks = cbs
        return new AbortController()
      })

      useSessionStore.setState({ currentSessionId: 'sess-1', messages: [] })
      await useSessionStore.getState().sendMessage('Hello')

      callbacks.onChunk('Hello ')
      callbacks.onChunk('world')

      const segments = useSessionStore.getState().streamingSegments['sess-1']
      expect(segments).toHaveLength(1)
      expect(segments[0]).toEqual({ type: 'text', content: 'Hello world' })
    })

    it('stopStream joins all text segments into synthetic message', async () => {
      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: [makeMessage()],
        streamingSessionIds: new Set(['sess-1']),
        streamingSegments: {
          'sess-1': [
            { type: 'text', content: 'Part 1. ' },
            { type: 'tool', toolCall: { toolUseId: 'tu-1', toolName: 'read_file', toolInput: {}, status: 'done' } },
            { type: 'text', content: 'Part 2.' }
          ]
        }
      })

      useSessionStore.getState().stopStream()

      const state = useSessionStore.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[1].content).toBe('Part 1. Part 2.')
      expect(mockChatApi.stopStream).toHaveBeenCalledWith('sess-1', 'Part 1. Part 2.')
    })
  })

  describe('openAllChats', () => {
    it('clears currentSessionId and messages', () => {
      useSessionStore.setState({
        currentSessionId: 'sess-1',
        messages: [makeMessage()],
        allChatsOpen: false,
        projectsOpen: true,
        error: 'some error',
        artifactPanel: { code: 'x', title: 'y' }
      })

      useSessionStore.getState().openAllChats()

      const state = useSessionStore.getState()
      expect(state.currentSessionId).toBeNull()
      expect(state.messages).toHaveLength(0)
      expect(state.allChatsOpen).toBe(true)
      expect(state.projectsOpen).toBe(false)
      expect(state.error).toBeNull()
      expect(state.artifactPanel).toBeNull()
    })
  })
})
