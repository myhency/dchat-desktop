import { create } from 'zustand'
import { chatApi } from '../api/chat.api'
import { sessionApi } from '../api/session.api'
import { useProjectStore } from '@/entities/project'
import { useSettingsStore } from '@/entities/settings'
import type { ImageAttachment, Message } from '@dchat/shared'

export type { ImageAttachment, Message }

export interface Session {
  id: string
  title: string
  model: string
  projectId: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface ToolCallInfo {
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
  status: 'calling' | 'done' | 'error'
  result?: string
  isError?: boolean
}

interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  messages: Message[]
  streamingSessionIds: Set<string>
  streamingContents: Record<string, string>
  activeToolCalls: ToolCallInfo[]
  error: string | null
  searchOpen: boolean
  allChatsOpen: boolean
  projectsOpen: boolean
  artifactPanel: { code: string; title: string } | null

  loadSessions: () => Promise<void>
  createSession: (title: string, model: string, projectId?: string | null) => Promise<Session>
  deselectSession: () => void
  selectSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  sendMessage: (content: string, attachments?: ImageAttachment[]) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  editMessage: (messageId: string, content: string) => Promise<void>
  stopStream: () => void
  setSessionTitleLocal: (sessionId: string, title: string) => void
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  updateSessionModel: (sessionId: string, model: string) => Promise<void>
  openSearch: () => void
  closeSearch: () => void
  openAllChats: () => void
  closeAllChats: () => void
  openProjects: () => void
  closeProjects: () => void
  openArtifact: (code: string, title: string) => void
  closeArtifact: () => void
  toggleSessionFavorite: (sessionId: string) => Promise<void>
  updateSessionProjectId: (sessionId: string, projectId: string | null) => Promise<void>
}

// Active SSE abort controllers per session
const activeControllers = new Map<string, AbortController>()

export const useSessionStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  streamingSessionIds: new Set(),
  streamingContents: {},
  activeToolCalls: [],
  error: null,
  searchOpen: false,
  allChatsOpen: false,
  projectsOpen: false,
  artifactPanel: null,

  loadSessions: async () => {
    const sessions = await sessionApi.list()
    set({ sessions })
  },

  createSession: async (title, model, projectId) => {
    const session = await sessionApi.create(title, model, projectId)
    set((state) => ({ sessions: [session, ...state.sessions] }))
    await get().selectSession(session.id)
    return session
  },

  deselectSession: () => {
    set({ currentSessionId: null, messages: [], error: null, allChatsOpen: false, projectsOpen: false, artifactPanel: null })
  },

  selectSession: async (id) => {
    const messages = await chatApi.getMessages(id)
    set({ currentSessionId: id, messages, error: null, allChatsOpen: false, projectsOpen: false, artifactPanel: null })
  },

  deleteSession: async (id) => {
    await sessionApi.delete(id)
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

  sendMessage: async (content, attachments) => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    const imgs = attachments ?? []
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sessionId: currentSessionId,
      role: 'user',
      content,
      attachments: imgs,
      createdAt: new Date().toISOString()
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      streamingSessionIds: new Set([...state.streamingSessionIds, currentSessionId]),
      streamingContents: { ...state.streamingContents, [currentSessionId]: '' },
      activeToolCalls: [],
      error: null
    }))

    const sessionId = currentSessionId
    const controller = chatApi.sendMessage(sessionId, content, imgs, {
      onChunk: (text) => {
        if (!get().streamingSessionIds.has(sessionId)) return
        set((state) => ({
          streamingContents: {
            ...state.streamingContents,
            [sessionId]: (state.streamingContents[sessionId] ?? '') + text
          }
        }))
      },
      onTitle: (sid, title) => {
        get().setSessionTitleLocal(sid, title)
      },
      onToolUse: (data) => {
        if (sessionId !== get().currentSessionId) return
        set((s) => ({
          activeToolCalls: [...s.activeToolCalls, {
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            toolInput: data.toolInput,
            status: 'calling'
          }],
          // Reset streaming content for next LLM turn
          streamingContents: { ...s.streamingContents, [sessionId]: '' }
        }))
      },
      onToolResult: (data) => {
        if (sessionId !== get().currentSessionId) return
        set((s) => ({
          activeToolCalls: s.activeToolCalls.map((tc) =>
            tc.toolUseId === data.toolUseId
              ? { ...tc, status: data.isError ? 'error' as const : 'done' as const, result: data.content, isError: data.isError }
              : tc
          )
        }))
      },
      onEnd: (message) => {
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
            streamingContents: rest,
            activeToolCalls: []
          }
        })

        // Sync messages from backend
        if (isCurrentSession) {
          chatApi.getMessages(sessionId).then((msgs) => {
            if (get().currentSessionId === sessionId) {
              set({ messages: msgs })
            }
          })
        }

        activeControllers.delete(sessionId)
      },
      onError: (error) => {
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
            streamingContents: rest,
            activeToolCalls: []
          }
        })

        activeControllers.delete(sessionId)
      }
    })

    activeControllers.set(sessionId, controller)
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

    const sessionId = currentSessionId
    const controller = chatApi.regenerate(sessionId, messageId, {
      onChunk: (text) => {
        if (!get().streamingSessionIds.has(sessionId)) return
        set((state) => ({
          streamingContents: {
            ...state.streamingContents,
            [sessionId]: (state.streamingContents[sessionId] ?? '') + text
          }
        }))
      },
      onTitle: (sid, title) => {
        get().setSessionTitleLocal(sid, title)
      },
      onEnd: (message) => {
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

        if (isCurrentSession) {
          chatApi.getMessages(sessionId).then((msgs) => {
            if (get().currentSessionId === sessionId) {
              set({ messages: msgs })
            }
          })
        }

        activeControllers.delete(sessionId)
      },
      onError: (error) => {
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

        activeControllers.delete(sessionId)
      }
    })

    activeControllers.set(sessionId, controller)
  },

  editMessage: async (messageId, content) => {
    const { currentSessionId, messages } = get()
    if (!currentSessionId) return

    const targetIndex = messages.findIndex((m) => m.id === messageId)
    if (targetIndex === -1) return

    // Optimistic update: change content and remove subsequent messages
    const updatedMessages = messages.slice(0, targetIndex + 1)
    updatedMessages[targetIndex] = { ...updatedMessages[targetIndex], content }

    set((state) => ({
      messages: updatedMessages,
      streamingSessionIds: new Set([...state.streamingSessionIds, currentSessionId]),
      streamingContents: { ...state.streamingContents, [currentSessionId]: '' },
      error: null
    }))

    const sessionId = currentSessionId
    const controller = chatApi.editMessage(sessionId, messageId, content, {
      onChunk: (text) => {
        if (!get().streamingSessionIds.has(sessionId)) return
        set((state) => ({
          streamingContents: {
            ...state.streamingContents,
            [sessionId]: (state.streamingContents[sessionId] ?? '') + text
          }
        }))
      },
      onTitle: (sid, title) => {
        get().setSessionTitleLocal(sid, title)
      },
      onEnd: (message) => {
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

        if (isCurrentSession) {
          chatApi.getMessages(sessionId).then((msgs) => {
            if (get().currentSessionId === sessionId) {
              set({ messages: msgs })
            }
          })
        }

        activeControllers.delete(sessionId)
      },
      onError: (error) => {
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

        activeControllers.delete(sessionId)
      }
    })

    activeControllers.set(sessionId, controller)
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
            attachments: [],
            createdAt: new Date().toISOString()
          }]
        } : {}),
        streamingSessionIds: newIds,
        streamingContents: rest
      }
    })

    // Abort SSE and notify backend
    const controller = activeControllers.get(currentSessionId)
    controller?.abort()
    activeControllers.delete(currentSessionId)
    chatApi.stopStream(currentSessionId, content)
  },

  setSessionTitleLocal: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      )
    }))
  },

  updateSessionTitle: async (sessionId, title) => {
    await sessionApi.updateTitle(sessionId, title)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      )
    }))
  },

  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  openAllChats: () => {
    set({ allChatsOpen: true, projectsOpen: false, currentSessionId: null, messages: [], error: null, artifactPanel: null })
  },
  closeAllChats: () => set({ allChatsOpen: false }),

  openProjects: () => {
    useProjectStore.getState().deselectProject()
    set({ projectsOpen: true, allChatsOpen: false, currentSessionId: null, messages: [], error: null, artifactPanel: null })
  },
  closeProjects: () => set({ projectsOpen: false }),

  openArtifact: (code, title) => {
    useSettingsStore.setState({ sidebarOpen: false })
    set({ artifactPanel: { code, title } })
  },
  closeArtifact: () => set({ artifactPanel: null }),

  updateSessionModel: async (sessionId, model) => {
    await sessionApi.updateModel(sessionId, model)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, model } : s
      )
    }))
  },

  toggleSessionFavorite: async (sessionId) => {
    await sessionApi.toggleFavorite(sessionId)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isFavorite: !s.isFavorite } : s
      )
    }))
  },

  updateSessionProjectId: async (sessionId, projectId) => {
    await sessionApi.updateProjectId(sessionId, projectId)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, projectId } : s
      )
    }))
  }
}))
