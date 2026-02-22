import { apiFetch } from '@/shared/api'
import type {
  McpServerConfigDTO,
  McpServerStatusDTO,
  CreateMcpServerRequest,
  UpdateMcpServerRequest
} from '@dchat/shared'

export const mcpApi = {
  listServers: () =>
    apiFetch<McpServerConfigDTO[]>('/api/mcp/servers'),

  getStatuses: () =>
    apiFetch<McpServerStatusDTO[]>('/api/mcp/servers/status'),

  createServer: (data: CreateMcpServerRequest) =>
    apiFetch<McpServerConfigDTO>('/api/mcp/servers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateServer: (id: string, data: UpdateMcpServerRequest) =>
    apiFetch<McpServerConfigDTO>(`/api/mcp/servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteServer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/mcp/servers/${id}`, {
      method: 'DELETE'
    }),

  startServer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/mcp/servers/${id}/start`, {
      method: 'POST'
    }),

  stopServer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/mcp/servers/${id}/stop`, {
      method: 'POST'
    }),

  restartServer: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/mcp/servers/${id}/restart`, {
      method: 'POST'
    }),

  getLogs: (id: string) =>
    apiFetch<string[]>(`/api/mcp/servers/${id}/logs`),

  getConfigPath: () =>
    apiFetch<{ path: string }>('/api/mcp/config-path'),

  reload: () =>
    apiFetch<{ ok: boolean }>('/api/mcp/reload', { method: 'POST' })
}
