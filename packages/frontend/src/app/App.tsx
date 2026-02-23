import { useEffect, useState } from 'react'
import { MainLayout } from '@/widgets/main-layout'
import { getApiBase } from '@/shared/api/client'
import { useSessionStore } from '@/entities/session'
import { useProjectStore } from '@/entities/project'
import { useSettingsStore } from '@/entities/settings'
import { QuickChatPage } from '@/pages/quick-chat'

const isQuickChatMode = new URLSearchParams(window.location.search).get('mode') === 'quick-chat'

function App(): React.JSX.Element | null {
  const loadSessions = useSessionStore((s) => s.loadSessions)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const apiBase = getApiBase()
    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${apiBase}/api/health`)
          if (res.ok) {
            const data = await res.json()
            if (data.status === 'ok') { if (!cancelled) setReady(true); return }
          }
        } catch { /* backend not up yet */ }
        await new Promise((r) => setTimeout(r, 500))
      }
    }
    poll()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return
    if (isQuickChatMode) {
      // Quick chat popup only needs settings (for selected model)
      loadSettings().catch((err) => console.error('[dchat] settings load failed:', err))
    } else {
      Promise.all([loadSettings(), loadSessions(), loadProjects()])
        .catch((err) => console.error('[dchat] init failed:', err))
    }
  }, [ready, loadSettings, loadSessions, loadProjects])

  // Register navigate-to-session listener for main window
  useEffect(() => {
    if (!ready || isQuickChatMode) return
    const electron = (window as any).electron
    if (!electron?.onNavigateToSession) return

    electron.onNavigateToSession(async (sessionId: string, message: string) => {
      const store = useSessionStore.getState()
      const settingsStore = useSettingsStore.getState()
      settingsStore.closeSettings()
      await store.loadSessions()
      await store.selectSession(sessionId)
      store.sendMessage(message)
    })
  }, [ready])

  if (!ready) return null

  if (isQuickChatMode) return <QuickChatPage />

  return <MainLayout />
}

export default App
