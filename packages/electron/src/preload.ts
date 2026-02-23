import { contextBridge, ipcRenderer } from 'electron'

// 모듈 스코프 — preload 실행 시점에 즉시 리스너 등록 (레이스 컨디션 방지)
let navigateCallback: ((sessionId: string, message: string) => void) | null = null
let pendingNavigate: { sessionId: string; message: string } | null = null

ipcRenderer.on('native:navigate-to-session', (_event, sessionId, message) => {
  if (navigateCallback) {
    navigateCallback(sessionId, message)
  } else {
    pendingNavigate = { sessionId, message }
  }
})

const electronApi = {
  pickImage: () => ipcRenderer.invoke('native:pick-image'),
  openInBrowser: (htmlContent: string) =>
    ipcRenderer.invoke('native:open-in-browser', htmlContent),
  getApiUrl: (): string => {
    // This is called synchronously; the value is cached after first IPC call
    // We use sendSync for the initial API URL retrieval
    return ipcRenderer.sendSync('native:get-api-url-sync')
  },
  openFile: (filePath: string) => ipcRenderer.invoke('native:open-file', filePath),
  openLogFolder: () => ipcRenderer.invoke('native:open-log-folder'),
  sendQuickChat: (text: string, model: string) =>
    ipcRenderer.invoke('native:quick-chat-send', text, model),
  setShowInMenuBar: (visible: boolean) =>
    ipcRenderer.invoke('native:set-show-in-menu-bar', visible),
  onNavigateToSession: (callback: (sessionId: string, message: string) => void) => {
    navigateCallback = callback
    if (pendingNavigate) {
      const { sessionId, message } = pendingNavigate
      pendingNavigate = null
      callback(sessionId, message)
    }
  }
}

export type ElectronAPI = typeof electronApi

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronApi)
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electron = electronApi
}
