import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { ChevronDown, Star, Pencil, FolderSync, FolderMinus, Trash2 } from 'lucide-react'
import { useChatStore } from '../../stores/chat.store'
import { useProjectStore } from '../../stores/project.store'

export function ChatHeader(): React.JSX.Element | null {
  const sessions = useChatStore((s) => s.sessions)
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const updateSessionTitle = useChatStore((s) => s.updateSessionTitle)
  const updateSessionProjectId = useChatStore((s) => s.updateSessionProjectId)
  const toggleSessionFavorite = useChatStore((s) => s.toggleSessionFavorite)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const projects = useProjectStore((s) => s.projects)

  const session = sessions.find((s) => s.id === currentSessionId)

  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const saveTitle = useCallback(() => {
    if (!session) return
    const trimmed = editTitle.trim()
    setRenaming(false)
    if (trimmed && trimmed !== session.title) {
      updateSessionTitle(session.id, trimmed)
    }
  }, [session, editTitle, updateSessionTitle])

  const handleRenameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault()
        saveTitle()
      } else if (e.key === 'Escape') {
        setRenaming(false)
      }
    },
    [saveTitle]
  )

  if (!session || !session.projectId) return null

  const project = projects.find((p) => p.id === session.projectId)
  if (!project) return null

  return (
    <div className="flex items-center px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
      <div className="relative" ref={menuRef}>
        {renaming ? (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">
              {project.name}
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">/</span>
            <input
              className="bg-transparent text-sm text-neutral-800 dark:text-neutral-100 outline-none border-b border-blue-500 py-0.5"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={saveTitle}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
        ) : (
          <button
            ref={triggerRef}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg px-2 py-1 transition-colors"
          >
            <span className="text-neutral-500 dark:text-neutral-400">
              {project.name}
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">/</span>
            <span className="text-neutral-800 dark:text-neutral-100">
              {session.title}
            </span>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>
        )}

        {menuOpen && (
          <div className="absolute top-full mt-1 left-0 z-50 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg py-1">
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => {
                toggleSessionFavorite(session.id)
                setMenuOpen(false)
              }}
            >
              <Star size={16} fill={session.isFavorite ? 'currentColor' : 'none'} />
              {session.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => {
                setEditTitle(session.title)
                setRenaming(true)
                setMenuOpen(false)
              }}
            >
              <Pencil size={16} />
              이름 변경
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <FolderSync size={16} />
              프로젝트 변경
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => {
                updateSessionProjectId(session.id, null)
                setMenuOpen(false)
              }}
            >
              <FolderMinus size={16} />
              프로젝트에서 제거
            </button>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              onClick={() => {
                deleteSession(session.id)
                setMenuOpen(false)
              }}
            >
              <Trash2 size={16} />
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
