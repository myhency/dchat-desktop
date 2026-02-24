import type { ImageAttachment } from '@dchat/shared'

const isElectron = typeof window !== 'undefined' && !!(window as any).electron

/**
 * Pick images — uses Electron native dialog or browser file input
 */
export async function pickImage(): Promise<ImageAttachment[]> {
  if (isElectron) {
    return (window as any).electron.pickImage()
  }

  // Web fallback: file input
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/gif,image/webp'
    input.multiple = true

    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) {
        resolve([])
        return
      }

      const attachments: ImageAttachment[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const buffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        attachments.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          mimeType: file.type || 'image/png',
          base64Data: base64
        })
      }
      resolve(attachments)
    }

    input.oncancel = () => resolve([])
    input.click()
  })
}

/**
 * Pick a directory — uses Electron native dialog, returns null on web
 */
export async function pickDirectory(): Promise<string | null> {
  if (isElectron) {
    return (window as any).electron.pickDirectory()
  }
  return null
}

/**
 * Open HTML content in browser — uses Electron shell or window.open
 */
export function openInBrowser(htmlContent: string): void {
  if (isElectron) {
    ;(window as any).electron.openInBrowser(htmlContent)
    return
  }

  // Web fallback: blob URL
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

/**
 * Open a file with system default application — Electron only
 */
export function openFile(path: string): Promise<string> | undefined {
  if (isElectron) {
    return (window as any).electron.openFile(path)
  }
  return undefined
}

/**
 * Open log folder — Electron only, no web fallback
 */
export function openLogFolder(): Promise<string> | undefined {
  if (isElectron) {
    return (window as any).electron.openLogFolder()
  }
  return undefined
}

/**
 * Send quick chat message — Electron tray popup only
 */
export function sendQuickChat(text: string, model: string): Promise<string> | undefined {
  if (isElectron) {
    return (window as any).electron.sendQuickChat(text, model)
  }
  return undefined
}

/**
 * Toggle menu bar tray visibility — Electron only
 */
export function setShowInMenuBar(visible: boolean): Promise<void> | undefined {
  if (isElectron) {
    return (window as any).electron.setShowInMenuBar(visible)
  }
  return undefined
}

/**
 * Listen for navigate-to-session events from main process — Electron only
 */
export function onNavigateToSession(callback: (sessionId: string, message: string) => void): void {
  if (isElectron && (window as any).electron.onNavigateToSession) {
    (window as any).electron.onNavigateToSession(callback)
  }
}
