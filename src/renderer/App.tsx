import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { useChatStore } from './stores/chat.store'
import { useProjectStore } from './stores/project.store'
import { useSettingsStore } from './stores/settings.store'
import { useIpcListeners } from './hooks/useIpc'

function App(): React.JSX.Element {
  const loadSessions = useChatStore((s) => s.loadSessions)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useIpcListeners()

  useEffect(() => {
    loadSettings()
    loadSessions()
    loadProjects()
  }, [loadSettings, loadSessions, loadProjects])

  return <MainLayout />
}

export default App
