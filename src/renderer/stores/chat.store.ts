import { create } from 'zustand'

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Session {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
}

interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  messages: Message[]
  streamingSessionIds: Set<string>
  streamingContents: Record<string, string>
  error: string | null
  searchOpen: boolean
  allChatsOpen: boolean

  loadSessions: () => Promise<void>
  createSession: (title: string, model: string) => Promise<Session>
  deselectSession: () => void
  selectSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  stopStream: () => void
  appendStreamChunk: (sessionId: string, text: string) => void
  finishStream: (sessionId: string, message: Message) => void
  setStreamError: (sessionId: string, error: string) => void
  setSessionTitleLocal: (sessionId: string, title: string) => void
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  updateSessionModel: (sessionId: string, model: string) => Promise<void>
  openSearch: () => void
  closeSearch: () => void
  openAllChats: () => void
  closeAllChats: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  streamingSessionIds: new Set(),
  streamingContents: {},
  error: null,
  searchOpen: false,
  allChatsOpen: false,

  loadSessions: async () => {
    const sessions = await window.hchat.session.list()
    set({ sessions })
  },

  createSession: async (title, model) => {
    const session = await window.hchat.session.create(title, model)
    set((state) => ({ sessions: [session, ...state.sessions] }))
    await get().selectSession(session.id)
    return session
  },

  deselectSession: () => {
    set({ currentSessionId: null, messages: [], error: null, allChatsOpen: false })
  },

  selectSession: async (id) => {
    const messages = await window.hchat.chat.getMessages(id)
    set({ currentSessionId: id, messages, error: null, allChatsOpen: false })
  },

  deleteSession: async (id) => {
    await window.hchat.session.delete(id)
    const state = get()
    const remaining = state.sessions.filter((s) => s.id !== id)
    const newCurrentId =
      state.currentSessionId === id
        ? remaining[0]?.id ?? null
        : state.currentSessionId

    set({ sessions: remaining, currentSessionId: newCurrentId })
    if (newCurrentId && newCurrentId !== state.currentSessionId) {
      await get().selectSession(newCurrentId)
    } else if (!newCurrentId) {
      set({ messages: [] })
    }
  },

  sendMessage: async (content) => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sessionId: currentSessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      streamingSessionIds: new Set([...state.streamingSessionIds, currentSessionId]),
      streamingContents: { ...state.streamingContents, [currentSessionId]: '' },
      error: null
    }))

    try {
      await window.hchat.chat.sendMessage(currentSessionId, content)
    } catch {
      // 에러는 onStreamError 콜백에서 처리됨
    }
  },

  regenerateMessage: async (messageId) => {
    const { currentSessionId, messages } = get()
    if (!currentSessionId) return

    const targetIndex = messages.findIndex((m) => m.id === messageId)
    if (targetIndex === -1) return

    const target = messages[targetIndex]
    const keepMessages = target.role === 'user'
      ? messages.slice(0, targetIndex + 1)
      : messages.slice(0, targetIndex)

    set((state) => ({
      messages: keepMessages,
      streamingSessionIds: new Set([...state.streamingSessionIds, currentSessionId]),
      streamingContents: { ...state.streamingContents, [currentSessionId]: '' },
      error: null
    }))

    try {
      await window.hchat.chat.regenerate(currentSessionId, messageId)
    } catch {
      // 에러는 onStreamError 콜백에서 처리됨
    }
  },

  stopStream: () => {
    const { streamingContents, currentSessionId } = get()
    if (!currentSessionId) return
    const content = streamingContents[currentSessionId] ?? ''

    set((s) => {
      const newIds = new Set(s.streamingSessionIds)
      newIds.delete(currentSessionId)
      const { [currentSessionId]: _, ...rest } = s.streamingContents
      return {
        ...(content ? {
          messages: [...s.messages, {
            id: crypto.randomUUID(),
            sessionId: currentSessionId,
            role: 'assistant' as const,
            content,
            createdAt: new Date().toISOString()
          }]
        } : {}),
        streamingSessionIds: newIds,
        streamingContents: rest
      }
    })
    window.hchat.chat.stopStream(currentSessionId, content)
  },

  appendStreamChunk: (sessionId, text) => {
    if (!get().streamingSessionIds.has(sessionId)) return
    set((state) => ({
      streamingContents: {
        ...state.streamingContents,
        [sessionId]: (state.streamingContents[sessionId] ?? '') + text
      }
    }))
  },

  finishStream: (sessionId, message) => {
    const state = get()
    if (!state.streamingSessionIds.has(sessionId)) return
    const isCurrentSession = sessionId === state.currentSessionId

    set((s) => {
      const newIds = new Set(s.streamingSessionIds)
      newIds.delete(sessionId)
      const { [sessionId]: _, ...rest } = s.streamingContents
      return {
        ...(isCurrentSession && message.content
          ? { messages: [...s.messages, message] }
          : {}),
        streamingSessionIds: newIds,
        streamingContents: rest
      }
    })
  },

  setStreamError: (sessionId, error) => {
    const state = get()
    if (!state.streamingSessionIds.has(sessionId)) return
    const isCurrentSession = sessionId === state.currentSessionId

    set((s) => {
      const newIds = new Set(s.streamingSessionIds)
      newIds.delete(sessionId)
      const { [sessionId]: _, ...rest } = s.streamingContents
      return {
        ...(isCurrentSession ? { error } : {}),
        streamingSessionIds: newIds,
        streamingContents: rest
      }
    })
  },

  setSessionTitleLocal: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      )
    }))
  },

  updateSessionTitle: async (sessionId, title) => {
    await window.hchat.session.updateTitle(sessionId, title)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      )
    }))
  },

  openSearch: () => {
    set({ searchOpen: true })
  },

  closeSearch: () => {
    set({ searchOpen: false })
  },

  openAllChats: () => {
    set({ allChatsOpen: true, currentSessionId: null, messages: [], error: null })
  },

  closeAllChats: () => {
    set({ allChatsOpen: false })
  },

  updateSessionModel: async (sessionId, model) => {
    await window.hchat.session.updateModel(sessionId, model)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, model } : s
      )
    }))
  }
}))
