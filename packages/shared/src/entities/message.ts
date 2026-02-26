export interface ImageAttachment {
  id: string
  fileName: string
  mimeType: string
  base64Data: string
}

export type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'tool'; toolUseId: string; toolName: string; toolInput: Record<string, unknown>; result?: string; isError?: boolean }

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  attachments: ImageAttachment[]
  segments?: MessageSegment[]
  createdAt: string
}
