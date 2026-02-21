import { useEffect } from 'react'
import { PanelLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { ChatArea } from '../chat/ChatArea'
import { ArtifactPanel } from '../chat/ArtifactPanel'
import { SettingsScreen } from '../settings/SettingsScreen'
import { SearchModal } from '../search/SearchModal'
import { useChatStore } from '../../stores/chat.store'
import { useSettingsStore } from '../../stores/settings.store'

export function MainLayout(): React.JSX.Element {
  const openSearch = useChatStore((s) => s.openSearch)
  const searchOpen = useChatStore((s) => s.searchOpen)
  const closeSearch = useChatStore((s) => s.closeSearch)
  const artifactPanel = useChatStore((s) => s.artifactPanel)
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen)
  const settingsOpen = useSettingsStore((s) => s.settingsOpen)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (searchOpen) {
          closeSearch()
        } else {
          openSearch()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        toggleSettings()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch, searchOpen, closeSearch, toggleSidebar, toggleSettings])

  return (
    <div className="flex h-screen flex-col">
      <div
        className="flex items-center h-[38px] shrink-0 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          onClick={toggleSidebar}
          className="ml-[78px] p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Toggle sidebar"
        >
          <PanelLeft size={16} />
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden transition-[width] duration-200 ease-in-out`}>
          <Sidebar />
        </div>
        {settingsOpen ? <SettingsScreen /> : (
          <>
            <ChatArea />
            {artifactPanel && <ArtifactPanel />}
          </>
        )}
        <SearchModal />
      </div>
    </div>
  )
}
