export interface ImageAttachment {
  id: string
  fileName: string
  mimeType: string
  base64Data: string
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  attachments: ImageAttachment[]
  createdAt: Date
}
