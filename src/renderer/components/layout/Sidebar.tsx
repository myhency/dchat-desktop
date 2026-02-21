import { useState } from 'react'
import { Plus, Search, FolderOpen, MoreHorizontal, MessageSquare, ChevronsUpDown, Box } from 'lucide-react'
import { useChatStore } from '../../stores/chat.store'
import { useProjectStore } from '../../stores/project.store'
import { useSettingsStore } from '../../stores/settings.store'
import { SessionContextMenu } from './SessionContextMenu'
import { SettingsMenu } from './SettingsMenu'

export function Sidebar(): React.JSX.Element {
  const sessions = useChatStore((s) => s.sessions)
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const deselectSession = useChatStore((s) => s.deselectSession)
  const selectSession = useChatStore((s) => s.selectSession)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const updateSessionTitle = useChatStore((s) => s.updateSessionTitle)
  const openSearch = useChatStore((s) => s.openSearch)
  const openAllChats = useChatStore((s) => s.openAllChats)
  const openProjects = useChatStore((s) => s.openProjects)
  const toggleSessionFavorite = useChatStore((s) => s.toggleSessionFavorite)
  const streamingSessionIds = useChatStore((s) => s.streamingSessionIds)
  const projects = useProjectStore((s) => s.projects)
  const selectProject = useProjectStore((s) => s.selectProject)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const closeSettings = useSettingsStore((s) => s.closeSettings)

  const [menuSessionId, setMenuSessionId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<HTMLElement | null>(null)

  const handleNewSession = () => {
    closeSettings()
    deselectSession()
  }

  const saveTitle = (sessionId: string, original: string) => {
    const trimmed = editingTitle.trim()
    setEditingSessionId(null)
    if (trimmed && trimmed !== original) {
      updateSessionTitle(sessionId, trimmed)
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
      {/* Top fixed area: New Chat + Search */}
      <div className="shrink-0 px-2 pt-3 pb-1 space-y-0.5">
        <button
          onClick={handleNewSession}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>새 채팅</span>
        </button>
        <button
          onClick={() => { closeSettings(); openSearch() }}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <Search size={16} />
          <span>검색</span>
        </button>
      </div>

      {/* Middle scroll area: Favorites + Recent sessions */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        <button
          onClick={() => { closeSettings(); openProjects() }}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <FolderOpen size={16} />
          <span>프로젝트</span>
        </button>
        {(sessions.some((s) => s.isFavorite) || projects.some((p) => p.isFavorite)) && (
          <>
            <div className="px-4 py-2 text-xs text-neutral-500 font-medium">즐겨찾기</div>
            {projects.filter((p) => p.isFavorite).map((project) => (
              <div
                key={project.id}
                className="flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => { closeSettings(); openProjects(); selectProject(project.id) }}
              >
                <Box size={16} className="shrink-0 text-neutral-400 mr-1.5" />
                <span className="truncate flex-1">{project.name}</span>
              </div>
            ))}
            {sessions.filter((s) => s.isFavorite).map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                  session.id === currentSessionId
                    ? 'bg-neutral-200 dark:bg-neutral-700'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                onClick={() => { closeSettings(); selectSession(session.id) }}
              >
                {streamingSessionIds.has(session.id) && session.id !== currentSessionId && (
                  <span className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
                )}
                {editingSessionId === session.id ? (
                  <input
                    className="flex-1 text-sm truncate bg-transparent border border-neutral-300 dark:border-neutral-600 rounded px-1 outline-none"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        saveTitle(session.id, session.title)
                      } else if (e.key === 'Escape') {
                        setEditingSessionId(null)
                      }
                    }}
                    onBlur={() => saveTitle(session.id, session.title)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="truncate flex-1">{session.title}</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuSessionId(session.id)
                    setMenuAnchor(e.currentTarget)
                  }}
                  className="hidden group-hover:block text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-2"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            ))}
          </>
        )}
        <div className="px-4 py-2 text-xs text-neutral-500 font-medium">최근 항목</div>
        {sessions.filter((s) => !s.isFavorite).slice(0, 30).map((session) => (
          <div
            key={session.id}
            className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
              session.id === currentSessionId
                ? 'bg-neutral-200 dark:bg-neutral-700'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            onClick={() => { closeSettings(); selectSession(session.id) }}
          >
            {streamingSessionIds.has(session.id) && session.id !== currentSessionId && (
              <span className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" />
            )}
            {editingSessionId === session.id ? (
              <input
                className="flex-1 text-sm truncate bg-transparent border border-neutral-300 dark:border-neutral-600 rounded px-1 outline-none"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    saveTitle(session.id, session.title)
                  } else if (e.key === 'Escape') {
                    setEditingSessionId(null)
                  }
                }}
                onBlur={() => saveTitle(session.id, session.title)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span className="truncate flex-1">{session.title}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuSessionId(session.id)
                setMenuAnchor(e.currentTarget)
              }}
              className="hidden group-hover:block text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-2"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}
        {sessions.filter((s) => !s.isFavorite).length > 30 && (
          <button
            onClick={() => { closeSettings(); openAllChats() }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            <MessageSquare size={16} />
            <span>모든 채팅</span>
          </button>
        )}
      </div>

      {/* Context menu */}
      {menuSessionId && menuAnchor && (
        <SessionContextMenu
          anchorEl={menuAnchor}
          isFavorite={sessions.find((s) => s.id === menuSessionId)?.isFavorite ?? false}
          onToggleFavorite={() => {
            toggleSessionFavorite(menuSessionId)
            setMenuSessionId(null)
            setMenuAnchor(null)
          }}
          onRename={() => {
            const session = sessions.find((s) => s.id === menuSessionId)
            if (session) {
              setEditingSessionId(menuSessionId)
              setEditingTitle(session.title)
            }
            setMenuSessionId(null)
            setMenuAnchor(null)
          }}
          onDelete={() => {
            deleteSession(menuSessionId)
            setMenuSessionId(null)
            setMenuAnchor(null)
          }}
          onClose={() => {
            setMenuSessionId(null)
            setMenuAnchor(null)
          }}
        />
      )}

      {/* Settings menu */}
      {settingsMenuAnchor && (
        <SettingsMenu
          anchorEl={settingsMenuAnchor}
          onSettings={openSettings}
          onClose={() => setSettingsMenuAnchor(null)}
        />
      )}

      {/* Bottom fixed area: Profile */}
      <div
        className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        onClick={(e) =>
          setSettingsMenuAnchor(settingsMenuAnchor ? null : e.currentTarget)
        }
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B9A6B] text-white text-xs font-semibold">
          DC
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold truncate">D Chat User</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Free 요금제</span>
        </div>
        <ChevronsUpDown size={16} className="text-neutral-400 shrink-0" />
      </div>
    </div>
  )
}
