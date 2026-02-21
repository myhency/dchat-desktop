import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { SettingsPanel } from './SettingsPanel'
import { ChatArea } from '../chat/ChatArea'
import { SearchModal } from '../search/SearchModal'
import { useChatStore } from '../../stores/chat.store'
import { useSettingsStore } from '../../stores/settings.store'

export function MainLayout(): React.JSX.Element {
  const openSearch = useChatStore((s) => s.openSearch)
  const searchOpen = useChatStore((s) => s.searchOpen)
  const closeSearch = useChatStore((s) => s.closeSearch)
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)

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
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch, searchOpen, closeSearch, toggleSidebar])

  return (
    <div className="flex h-screen flex-col">
      <div
        className="flex items-center h-[38px] shrink-0 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          onClick={toggleSidebar}
          className="ml-[78px] p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
            <line x1="5.5" y1="2.5" x2="5.5" y2="13.5" />
          </svg>
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden transition-[width] duration-200 ease-in-out`}>
          <Sidebar />
        </div>
        <ChatArea />
        <SettingsPanel />
        <SearchModal />
      </div>
    </div>
  )
}
