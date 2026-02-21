import { contextBridge, ipcRenderer } from 'electron'

const api = {
  chat: {
    sendMessage: (sessionId: string, content: string) =>
      ipcRenderer.invoke('chat:send-message', sessionId, content),
    getMessages: (sessionId: string) =>
      ipcRenderer.invoke('chat:get-messages', sessionId),
    onStreamChunk: (callback: (sessionId: string, chunk: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, chunk: unknown) =>
        callback(sessionId, chunk)
      ipcRenderer.on('chat:stream-chunk', listener)
      return () => ipcRenderer.removeListener('chat:stream-chunk', listener)
    },
    onStreamEnd: (callback: (sessionId: string, message: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, message: unknown) =>
        callback(sessionId, message)
      ipcRenderer.on('chat:stream-end', listener)
      return () => ipcRenderer.removeListener('chat:stream-end', listener)
    },
    onStreamError: (callback: (sessionId: string, error: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string, error: string) =>
        callback(sessionId, error)
      ipcRenderer.on('chat:stream-error', listener)
      return () => ipcRenderer.removeListener('chat:stream-error', listener)
    },
    stopStream: (sessionId: string, content: string) =>
      ipcRenderer.invoke('chat:stop-stream', sessionId, content),
    regenerate: (sessionId: string, messageId: string) =>
      ipcRenderer.invoke('chat:regenerate', sessionId, messageId)
  },
  session: {
    create: (title: string, model: string) =>
      ipcRenderer.invoke('session:create', title, model),
    list: () => ipcRenderer.invoke('session:list'),
    get: (id: string) => ipcRenderer.invoke('session:get', id),
    delete: (id: string) => ipcRenderer.invoke('session:delete', id),
    updateModel: (id: string, model: string) =>
      ipcRenderer.invoke('session:update-model', id, model),
    updateTitle: (id: string, title: string) =>
      ipcRenderer.invoke('session:update-title', id, title),
    toggleFavorite: (id: string) =>
      ipcRenderer.invoke('session:toggle-favorite', id),
    onTitleUpdated: (callback: (sessionId: string, title: string) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        sessionId: string,
        title: string
      ) => callback(sessionId, title)
      ipcRenderer.on('session:title-updated', listener)
      return () => ipcRenderer.removeListener('session:title-updated', listener)
    }
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all')
  },
  llm: {
    listModels: () => ipcRenderer.invoke('llm:list-models')
  },
  project: {
    create: (name: string, description: string) =>
      ipcRenderer.invoke('project:create', name, description),
    list: () => ipcRenderer.invoke('project:list'),
    delete: (id: string) => ipcRenderer.invoke('project:delete', id),
    update: (id: string, name: string, description: string) =>
      ipcRenderer.invoke('project:update', id, name, description)
  },
  artifact: {
    openInBrowser: (htmlContent: string) =>
      ipcRenderer.invoke('artifact:open-in-browser', htmlContent)
  }
}

export type HChatAPI = typeof api

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('hchat', api)
} else {
  // @ts-expect-error fallback for non-isolated context
  window.hchat = api
}
