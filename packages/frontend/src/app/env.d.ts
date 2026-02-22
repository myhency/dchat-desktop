/// <reference types="vite/client" />

import type { ImageAttachment } from '@dchat/shared'

declare global {
  interface Window {
    electron?: {
      pickImage: () => Promise<ImageAttachment[]>
      openInBrowser: (htmlContent: string) => void
      getApiUrl: () => string
      openLogFolder: () => Promise<string>
    }
  }
}
