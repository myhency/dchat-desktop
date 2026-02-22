import type { ImageAttachment } from './entities/message'

// ── Session ──

export interface CreateSessionRequest {
  title: string
  model: string
  projectId?: string | null
}

export interface UpdateModelRequest {
  model: string
}

export interface UpdateTitleRequest {
  title: string
}

export interface UpdateProjectRequest {
  projectId: string | null
}

// ── Chat ──

export interface SendMessageRequest {
  content: string
  attachments?: ImageAttachment[]
}

export interface StopStreamRequest {
  content: string
}

export interface EditMessageRequest {
  content: string
}

// ── Settings ──

export interface SetSettingRequest {
  value: string
}

// ── Project ──

export interface CreateProjectRequest {
  name: string
  description: string
}

export interface UpdateProjectRequest {
  name: string
  description: string
}

export interface UpdateInstructionsRequest {
  instructions: string
}

// ── SSE Event Types ──

export type SSEEventType = 'chunk' | 'title' | 'end' | 'error'

export interface SSEChunkEvent {
  type: 'text' | 'error' | 'done'
  content: string
}

export interface SSETitleEvent {
  sessionId: string
  title: string
}

export interface SSEEndEvent {
  id: string
  sessionId: string
  role: 'assistant'
  content: string
  attachments: ImageAttachment[]
  createdAt: string
}

export interface SSEErrorEvent {
  message: string
}

// ── Health ──

export interface HealthResponse {
  status: 'ok'
}
