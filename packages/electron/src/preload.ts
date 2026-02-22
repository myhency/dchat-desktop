import { contextBridge, ipcRenderer } from 'electron'

const electronApi = {
  pickImage: () => ipcRenderer.invoke('native:pick-image'),
  openInBrowser: (htmlContent: string) =>
    ipcRenderer.invoke('native:open-in-browser', htmlContent),
  getApiUrl: (): string => {
    // This is called synchronously; the value is cached after first IPC call
    // We use sendSync for the initial API URL retrieval
    return ipcRenderer.sendSync('native:get-api-url-sync')
  },
  openLogFolder: () => ipcRenderer.invoke('native:open-log-folder')
}

export type ElectronAPI = typeof electronApi

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronApi)
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electron = electronApi
}
