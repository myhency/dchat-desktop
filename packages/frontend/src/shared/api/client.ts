const API_BASE = (() => {
  // Electron shell injects getApiUrl via preload
  if (typeof window !== 'undefined' && (window as any).electron?.getApiUrl) {
    return (window as any).electron.getApiUrl()
  }
  // Dev fallback or standalone web mode
  return import.meta.env.VITE_API_URL || ''
})()

console.log('[dchat] API_BASE:', API_BASE || '(empty — using relative URLs)')

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const hasExternalSignal = !!options?.signal
  const controller = hasExternalSignal ? null : new AbortController()
  const timeout = controller ? setTimeout(() => controller.abort(), 10_000) : null

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller?.signal ?? options!.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })
    if (timeout) clearTimeout(timeout)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }

    return res.json()
  } catch (err) {
    if (timeout) clearTimeout(timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Request timeout: ${path}`)
    }
    throw err
  }
}

export interface SSEToolUseData {
  type: 'tool_use'
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
}

export interface SSEToolResultData {
  type: 'tool_result'
  toolUseId: string
  toolName: string
  content: string
  isError: boolean
}

export interface SSEToolStartData {
  type: 'tool_start'
  toolUseId: string
  toolName: string
}

export interface SSEToolConfirmData {
  type: 'tool_confirm'
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
}

export interface SSECallbacks {
  onChunk?: (data: { type: string; content: string }) => void
  onTitle?: (data: { sessionId: string; title: string }) => void
  onEnd?: (data: any) => void
  onError?: (data: { message: string }) => void
  onToolStart?: (data: SSEToolStartData) => void
  onToolUse?: (data: SSEToolUseData) => void
  onToolResult?: (data: SSEToolResultData) => void
  onToolConfirm?: (data: SSEToolConfirmData) => void
}

export function apiSSE(
  path: string,
  body: unknown,
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController()

  fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        const errorBody = await res.json().catch(() => ({}))
        callbacks.onError?.({ message: errorBody.error || `HTTP ${res.status}` })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            switch (currentEvent) {
              case 'chunk':
                callbacks.onChunk?.(data)
                break
              case 'title':
                callbacks.onTitle?.(data)
                break
              case 'end':
                callbacks.onEnd?.(data)
                break
              case 'error':
                callbacks.onError?.(data)
                break
              case 'tool_start':
                callbacks.onToolStart?.(data)
                break
              case 'tool_use':
                callbacks.onToolUse?.(data)
                break
              case 'tool_result':
                callbacks.onToolResult?.(data)
                break
              case 'tool_confirm':
                callbacks.onToolConfirm?.(data)
                break
            }
            currentEvent = ''
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.({ message: err.message })
      }
    })

  return controller
}

export function getApiBase(): string {
  return API_BASE
}
