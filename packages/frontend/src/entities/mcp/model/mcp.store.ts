import { create } from 'zustand'
import { mcpApi } from '../api/mcp.api'
import type { McpServerStatusDTO, McpToolDefinitionDTO } from '@dchat/shared'

interface McpState {
  servers: McpServerStatusDTO[]
  selectedServerId: string | null
  loading: boolean
  error: string | null
  logs: string[]
  logsServerId: string | null
  configPath: string

  loadServers: () => Promise<void>
  createServer: (name: string, command: string, args: string[], env?: Record<string, string>) => Promise<void>
  updateServer: (id: string, updates: { name?: string; command?: string; args?: string[]; env?: Record<string, string>; enabled?: boolean }) => Promise<void>
  deleteServer: (id: string) => Promise<void>
  startServer: (id: string) => Promise<void>
  stopServer: (id: string) => Promise<void>
  restartServer: (id: string) => Promise<void>
  selectServer: (id: string | null) => void
  loadLogs: (id: string) => Promise<void>
  closeLogs: () => void
  loadConfigPath: () => Promise<void>
  reloadConfig: () => Promise<void>
}

export type { McpServerStatusDTO, McpToolDefinitionDTO }

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  selectedServerId: null,
  loading: false,
  error: null,
  logs: [],
  logsServerId: null,
  configPath: '',

  loadServers: async () => {
    set({ loading: true, error: null })
    try {
      const servers = await mcpApi.getStatuses()
      set({ servers, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load servers', loading: false })
    }
  },

  createServer: async (name, command, args, env) => {
    try {
      await mcpApi.createServer({ name, command, args, env })
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create server' })
    }
  },

  updateServer: async (id, updates) => {
    try {
      await mcpApi.updateServer(id, updates)
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update server' })
    }
  },

  deleteServer: async (id) => {
    try {
      await mcpApi.deleteServer(id)
      const { selectedServerId } = get()
      set(selectedServerId === id ? { selectedServerId: null } : {})
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete server' })
    }
  },

  startServer: async (id) => {
    try {
      await mcpApi.startServer(id)
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to start server' })
    }
  },

  stopServer: async (id) => {
    try {
      await mcpApi.stopServer(id)
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to stop server' })
    }
  },

  restartServer: async (id) => {
    try {
      await mcpApi.restartServer(id)
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to restart server' })
    }
  },

  selectServer: (id) => {
    set({ selectedServerId: id })
  },

  loadLogs: async (id) => {
    try {
      const logs = await mcpApi.getLogs(id)
      set({ logs, logsServerId: id })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load logs' })
    }
  },

  closeLogs: () => {
    set({ logs: [], logsServerId: null })
  },

  loadConfigPath: async () => {
    try {
      const result = await mcpApi.getConfigPath()
      set({ configPath: result.path })
    } catch {
      // ignore
    }
  },

  reloadConfig: async () => {
    try {
      await mcpApi.reload()
      await get().loadServers()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to reload config' })
    }
  }
}))
