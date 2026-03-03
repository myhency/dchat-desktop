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

// ── Skill ──

export interface CreateSkillRequest {
  name: string
  description: string
  content: string
}

export interface UpdateSkillRequest {
  name?: string
  description?: string
  content?: string
  isEnabled?: boolean
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

// ── Backup ──

export interface BackupData {
  version: 1
  exportedAt: string
  data: {
    settings: Record<string, string>
    projects: Array<{ id: string; name: string; description: string; instructions: string; isFavorite: boolean; createdAt: string; updatedAt: string; memoryContent?: string; memoryUpdatedAt?: string | null }>
    sessions: Array<{ id: string; title: string; model: string; projectId: string | null; isFavorite: boolean; createdAt: string; updatedAt: string }>
    messages: Array<{ id: string; sessionId: string; role: 'user' | 'assistant'; content: string; attachments: ImageAttachment[]; createdAt: string }>
    skills?: Array<{ id: string; name: string; description: string; content: string; isEnabled: boolean; createdAt: string; updatedAt: string }>
  }
}

// ── MCP ──

export interface McpServerConfigDTO {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface McpToolDefinitionDTO {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverId: string
}

export interface McpServerStatusDTO {
  config: McpServerConfigDTO
  status: 'stopped' | 'running' | 'error'
  tools: McpToolDefinitionDTO[]
}

export interface CreateMcpServerRequest {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface UpdateMcpServerRequest {
  name?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  enabled?: boolean
}

// ── SSE Tool Events ──

export interface SSEToolUseEvent {
  type: 'tool_use'
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
}

export interface SSEToolResultEvent {
  type: 'tool_result'
  toolUseId: string
  toolName: string
  content: string
  isError: boolean
}

export interface SSEToolConfirmEvent {
  type: 'tool_confirm'
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
}

export interface ToolConfirmRequest {
  toolUseId: string
  approved: boolean
  alwaysAllow?: boolean
}

// ── Memory ──

export interface MemoryResponse {
  content: string
  updatedAt: string | null
}

export interface EditMemoryRequest {
  instruction: string
  model: string
}

// ── Project Memory ──

export interface ProjectMemoryResponse {
  content: string
  updatedAt: string | null
}

export interface EditProjectMemoryRequest {
  instruction: string
  model: string
}

// ── Built-in Tools ──

export interface BuiltinToolsStatusDTO {
  status: 'running' | 'error' | 'disabled'
  toolCount: number
  directories: string[]
  errors: string[]
  defaultDirectory: string
}

// ── Health ──

export interface HealthResponse {
  status: 'ok'
}
