import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { useChatStore } from './stores/chat.store'
import { useSettingsStore } from './stores/settings.store'
import { useIpcListeners } from './hooks/useIpc'

function App(): React.JSX.Element {
  const loadSessions = useChatStore((s) => s.loadSessions)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useIpcListeners()

  useEffect(() => {
    loadSettings()
    loadSessions()
  }, [loadSettings, loadSessions])

  return <MainLayout />
}

export default App
