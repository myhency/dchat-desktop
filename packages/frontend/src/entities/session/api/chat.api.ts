import { apiFetch, apiSSE } from '@/shared/api/client'
import type { SSEToolUseData, SSEToolResultData } from '@/shared/api/client'
import type { Message, ImageAttachment } from '@dchat/shared'

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onTitle: (sessionId: string, title: string) => void
  onEnd: (message: Message) => void
  onError: (error: string) => void
  onToolUse?: (data: SSEToolUseData) => void
  onToolResult?: (data: SSEToolResultData) => void
}

function buildSSECallbacks(callbacks: StreamCallbacks) {
  return {
    onChunk: (data: { type: string; content: string }) => {
      if (data.type === 'text') {
        callbacks.onChunk(data.content)
      }
    },
    onTitle: (data: { sessionId: string; title: string }) => callbacks.onTitle(data.sessionId, data.title),
    onEnd: (data: any) => callbacks.onEnd(data as Message),
    onError: (data: { message: string }) => callbacks.onError(data.message),
    onToolUse: callbacks.onToolUse,
    onToolResult: callbacks.onToolResult
  }
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
    apiSSE(`/api/chat/${sessionId}/messages`, { content, attachments }, buildSSECallbacks(callbacks)),

  regenerate: (
    sessionId: string,
    messageId: string,
    callbacks: StreamCallbacks
  ): AbortController =>
    apiSSE(`/api/chat/${sessionId}/messages/${messageId}/regenerate`, {}, buildSSECallbacks(callbacks)),

  editMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    callbacks: StreamCallbacks
  ): AbortController =>
    apiSSE(`/api/chat/${sessionId}/messages/${messageId}/edit`, { content }, buildSSECallbacks(callbacks)),

  stopStream: (sessionId: string, content: string) =>
    apiFetch(`/api/chat/${sessionId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
}
