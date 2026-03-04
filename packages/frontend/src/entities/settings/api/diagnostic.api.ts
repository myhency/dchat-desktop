import { getApiBase } from '@/shared/api/client'

export const diagnosticApi = {
  exportDiagnostics: async (): Promise<Blob> => {
    const res = await fetch(`${getApiBase()}/api/diagnostics/export`)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.blob()
  }
}
