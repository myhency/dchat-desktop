import { apiFetch, apiSSE } from '@/shared/api/client'
import type { Message, ImageAttachment } from '@dchat/shared'

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onTitle: (sessionId: string, title: string) => void
  onEnd: (message: Message) => void
  onError: (error: string) => void
}

export const chatApi = {
  getMessages: (sessionId: string) =>
    apiFetch<Message[]>(`/api/chat/${sessionId}/messages`),

  sendMessage: (
    sessionId: string,
    content: string,
    attachments: ImageAttachment[],
    callbacks: StreamCallbacks
  ): AbortController =>
    apiSSE(`/api/chat/${sessionId}/messages`, { content, attachments }, {
      onChunk: (data) => {
        if (data.type === 'text') {
          callbacks.onChunk(data.content)
        }
      },
      onTitle: (data) => callbacks.onTitle(data.sessionId, data.title),
      onEnd: (data) => callbacks.onEnd(data as Message),
      onError: (data) => callbacks.onError(data.message)
    }),

  regenerate: (
    sessionId: string,
    messageId: string,
    callbacks: StreamCallbacks
  ): AbortController =>
    apiSSE(`/api/chat/${sessionId}/messages/${messageId}/regenerate`, {}, {
      onChunk: (data) => {
        if (data.type === 'text') {
          callbacks.onChunk(data.content)
        }
      },
      onTitle: (data) => callbacks.onTitle(data.sessionId, data.title),
      onEnd: (data) => callbacks.onEnd(data as Message),
      onError: (data) => callbacks.onError(data.message)
    }),

  stopStream: (sessionId: string, content: string) =>
    apiFetch(`/api/chat/${sessionId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
}
