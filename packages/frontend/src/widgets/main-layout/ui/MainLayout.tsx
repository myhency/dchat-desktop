import { useEffect } from 'react'
import { PanelLeft } from 'lucide-react'
import { Sidebar } from '@/widgets/sidebar'
import { ArtifactPanel } from '@/widgets/artifact-panel'
import { SearchModal } from '@/features/search'
import { SettingsScreen } from '@/pages/settings'
import { HomeScreen } from '@/pages/home'
import { AllChatsScreen } from '@/pages/all-chats'
import { ProjectsScreen } from '@/pages/projects'
import { ProjectDetailScreen } from '@/pages/project-detail'
import { ChatPage } from '@/pages/chat'
import { useSessionStore } from '@/entities/session'
import { useProjectStore } from '@/entities/project'
import { useSettingsStore } from '@/entities/settings'

export function MainLayout(): React.JSX.Element {
  const openSearch = useSessionStore((s) => s.openSearch)
  const searchOpen = useSessionStore((s) => s.searchOpen)
  const closeSearch = useSessionStore((s) => s.closeSearch)
  const artifactPanel = useSessionStore((s) => s.artifactPanel)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const allChatsOpen = useSessionStore((s) => s.allChatsOpen)
  const projectsOpen = useSessionStore((s) => s.projectsOpen)
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
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
            {projectsOpen ? (
              selectedProjectId ? <ProjectDetailScreen /> : <ProjectsScreen />
            ) : allChatsOpen ? (
              <AllChatsScreen />
            ) : currentSessionId ? (
              <ChatPage />
            ) : (
              <HomeScreen />
            )}
            {artifactPanel && <ArtifactPanel />}
          </>
        )}
        <SearchModal />
      </div>
    </div>
  )
}
