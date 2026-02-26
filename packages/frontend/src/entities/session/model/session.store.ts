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
  status: 'calling' | 'done' | 'error' | 'confirming'
  result?: string
  isError?: boolean
}

export type StreamingSegment =
  | { type: 'text'; content: string }
  | { type: 'tool'; toolCall: ToolCallInfo }

interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  messages: Message[]
  streamingSessionIds: Set<string>
  streamingSegments: Record<string, StreamingSegment[]>
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
  confirmTool: (toolUseId: string, approved: boolean, alwaysAllow?: boolean) => void
  toggleSessionFavorite: (sessionId: string) => Promise<void>
  updateSessionProjectId: (sessionId: string, projectId: string | null) => Promise<void>
}

// Active SSE abort controllers per session
const activeControllers = new Map<string, AbortController>()

function appendText(segments: StreamingSegment[], text: string): StreamingSegment[] {
  const last = segments[segments.length - 1]
  if (last?.type === 'text') {
    const updated = [...segments]
    updated[updated.length - 1] = { type: 'text', content: last.content + text }
    return updated
  }
  return [...segments, { type: 'text', content: text }]
}

function updateToolInSegments(
  segments: StreamingSegment[],
  toolUseId: string,
  updater: (tc: ToolCallInfo) => ToolCallInfo
): StreamingSegment[] {
  return segments.map((seg) =>
    seg.type === 'tool' && seg.toolCall.toolUseId === toolUseId
      ? { type: 'tool', toolCall: updater(seg.toolCall) }
      : seg
  )
}

function getFullText(segments: StreamingSegment[]): string {
  return segments.filter((s): s is StreamingSegment & { type: 'text' } => s.type === 'text').map((s) => s.content).join('')
}

export const useSessionStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  streamingSessionIds: new Set(),
  streamingSegments: {},
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
      streamingSegments: { ...state.streamingSegments, [currentSessionId]: [] },
      error: null
    }))

    const sessionId = currentSessionId
    const controller = chatApi.sendMessage(sessionId, content, imgs, {
      onChunk: (text) => {
        if (!get().streamingSessionIds.has(sessionId)) return
        set((state) => ({
          streamingSegments: {
            ...state.streamingSegments,
            [sessionId]: appendText(state.streamingSegments[sessionId] ?? [], text)
          }
        }))
      },
      onTitle: (sid, title) => {
        get().setSessionTitleLocal(sid, title)
      },
      onToolStart: (data) => {
        if (sessionId !== get().currentSessionId) return
        set((s) => ({
          streamingSegments: {
            ...s.streamingSegments,
            [sessionId]: [...(s.streamingSegments[sessionId] ?? []), {
              type: 'tool' as const,
              toolCall: {
                toolUseId: data.toolUseId,
                toolName: data.toolName,
                toolInput: {},
                status: 'calling' as const
              }
            }]
          }
        }))
      },
      onToolUse: (data) => {
        if (sessionId !== get().currentSessionId) return
        set((s) => {
          const segs = s.streamingSegments[sessionId] ?? []
          const exists = segs.some(
            (seg) => seg.type === 'tool' && seg.toolCall.toolUseId === data.toolUseId
          )
          return {
            streamingSegments: {
              ...s.streamingSegments,
              [sessionId]: exists
                ? updateToolInSegments(segs, data.toolUseId, (tc) => ({
                    ...tc,
                    toolInput: data.toolInput
                  }))
                : [...segs, {
                    type: 'tool' as const,
                    toolCall: {
                      toolUseId: data.toolUseId,
                      toolName: data.toolName,
                      toolInput: data.toolInput,
                      status: 'calling' as const
                    }
                  }]
            }
          }
        })
      },
      onToolResult: (data) => {
        if (sessionId !== get().currentSessionId) return
        set((s) => ({
          streamingSegments: {
            ...s.streamingSegments,
            [sessionId]: updateToolInSegments(s.streamingSegments[sessionId] ?? [], data.toolUseId, (tc) => ({
              ...tc,
              status: data.isError ? 'error' as const : 'done' as const,
              result: data.content,
              isError: data.isError
            }))
          }
        }))
      },
      onToolConfirm: (data) => {
        if (sessionId !== get().currentSessionId) return
        set((s) => ({
          streamingSegments: {
            ...s.streamingSegments,
            [sessionId]: updateToolInSegments(s.streamingSegments[sessionId] ?? [], data.toolUseId, (tc) => ({
              ...tc,
              status: 'confirming' as const
            }))
          }
        }))
      },
      onEnd: (message) => {
        const state = get()
        if (!state.streamingSessionIds.has(sessionId)) return
        const isCurrentSession = sessionId === state.currentSessionId

        if (isCurrentSession) {
          // Current session: fetch messages first, then clear streaming in one atomic set()
          // to avoid intermediate state where streaming content is removed but messages aren't loaded yet
          chatApi.getMessages(sessionId).then((msgs) => {
            set((s) => {
              const newIds = new Set(s.streamingSessionIds)
              newIds.delete(sessionId)
              const { [sessionId]: _, ...rest } = s.streamingSegments
              return {
                ...(get().currentSessionId === sessionId ? { messages: msgs } : {}),
                streamingSessionIds: newIds,
                streamingSegments: rest
              }
            })
            activeControllers.delete(sessionId)
          })
        } else {
          // Different session: clear immediately (no scroll impact)
          set((s) => {
            const newIds = new Set(s.streamingSessionIds)
            newIds.delete(sessionId)
            const { [sessionId]: _, ...rest } = s.streamingSegments
            return {
              streamingSessionIds: newIds,
              streamingSegments: rest
            }
          })
          activeControllers.delete(sessionId)
        }
      },
      onError: (error) => {
        const state = get()
        if (!state.streamingSessionIds.has(sessionId)) return
        const isCurrentSession = sessionId === state.currentSessionId

        set((s) => {
          const newIds = new Set(s.streamingSessionIds)
          newIds.delete(sessionId)
          const { [sessionId]: _, ...rest } = s.streamingSegments
          return {
            ...(isCurrentSession ? { error } : {}),
            streamingSessionIds: newIds,
            streamingSegments: rest
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
      streamingSegments: { ...state.streamingSegments, [currentSessionId]: [] },
      error: null
    }))

    const sessionId = currentSessionId
    const controller = chatApi.regenerate(sessionId, messageId, {
      onChunk: (text) => {
        if (!get().streamingSessionIds.has(sessionId)) return
        set((state) => ({
          streamingSegments: {
            ...state.streamingSegments,
            [sessionId]: appendText(state.streamingSegments[sessionId] ?? [], text)
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
          const { [sessionId]: _, ...rest } = s.streamingSegments
          return {
            ...(isCurrentSession && message.content
              ? { messages: [...s.messages, message] }
              : {}),
            streamingSessionIds: newIds,
            streamingSegments: rest
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
          const { [sessionId]: _, ...rest } = s.streamingSegments
          return {
            ...(isCurrentSession ? { error } : {}),
            streamingSessionIds: newIds,
            streamingSegments: rest
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
      streamingSegments: { ...state.streamingSegments, [currentSessionId]: [] },
      error: null
    }))

    const sessionId = currentSessionId
    const controller = chatApi.editMessage(sessionId, messageId, content, {
      onChunk: (text) => {
        if (!get().streamingSessionIds.has(sessionId)) return
        set((state) => ({
          streamingSegments: {
            ...state.streamingSegments,
            [sessionId]: appendText(state.streamingSegments[sessionId] ?? [], text)
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
          const { [sessionId]: _, ...rest } = s.streamingSegments
          return {
            ...(isCurrentSession && message.content
              ? { messages: [...s.messages, message] }
              : {}),
            streamingSessionIds: newIds,
            streamingSegments: rest
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
          const { [sessionId]: _, ...rest } = s.streamingSegments
          return {
            ...(isCurrentSession ? { error } : {}),
            streamingSessionIds: newIds,
            streamingSegments: rest
          }
        })

        activeControllers.delete(sessionId)
      }
    })

    activeControllers.set(sessionId, controller)
  },

  stopStream: () => {
    const { streamingSegments, currentSessionId } = get()
    if (!currentSessionId) return
    const content = getFullText(streamingSegments[currentSessionId] ?? [])

    set((s) => {
      const newIds = new Set(s.streamingSessionIds)
      newIds.delete(currentSessionId)
      const { [currentSessionId]: _, ...rest } = s.streamingSegments
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
        streamingSegments: rest
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

  confirmTool: (toolUseId, approved, alwaysAllow) => {
    const { currentSessionId } = get()
    if (!currentSessionId) return
    // Update UI state
    set((s) => ({
      streamingSegments: {
        ...s.streamingSegments,
        [currentSessionId]: updateToolInSegments(s.streamingSegments[currentSessionId] ?? [], toolUseId, (tc) => ({
          ...tc,
          status: approved ? 'calling' as const : 'error' as const,
          ...(!approved ? { result: 'User denied the tool execution.', isError: true } : {})
        }))
      }
    }))
    // Send confirmation to backend
    chatApi.confirmTool(currentSessionId, toolUseId, approved, alwaysAllow)
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
