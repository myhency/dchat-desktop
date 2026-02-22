/// <reference types="vite/client" />

import type { ImageAttachment } from '@dchat/shared'

declare global {
  interface Window {
    electron?: {
      pickImage: () => Promise<ImageAttachment[]>
      openInBrowser: (htmlContent: string) => void
      openFile: (path: string) => Promise<string>
      getApiUrl: () => string
      openLogFolder: () => Promise<string>
    }
  }
}
