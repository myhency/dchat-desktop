import { useEffect, useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { getApiBase } from './api/client'
import { useChatStore } from './stores/chat.store'
import { useProjectStore } from './stores/project.store'
import { useSettingsStore } from './stores/settings.store'

function App(): React.JSX.Element {
  const loadSessions = useChatStore((s) => s.loadSessions)
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
    Promise.all([loadSettings(), loadSessions(), loadProjects()])
      .catch((err) => console.error('[dchat] init failed:', err))
  }, [ready, loadSettings, loadSessions, loadProjects])

  if (!ready) return null

  return <MainLayout />
}

export default App
