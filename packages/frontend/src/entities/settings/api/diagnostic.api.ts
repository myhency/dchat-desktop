import { getApiBase } from '@/shared/api/client'
import { getBufferedLogs } from '@/shared/lib/console-buffer'

export const diagnosticApi = {
  exportDiagnostics: async (): Promise<Blob> => {
    const res = await fetch(`${getApiBase()}/api/diagnostics/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontendLogs: getBufferedLogs() }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.blob()
  }
}
