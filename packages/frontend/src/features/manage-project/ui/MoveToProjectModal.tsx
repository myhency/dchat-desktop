import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Folder, CornerDownLeft } from 'lucide-react'
import { useProjectStore } from '@/entities/project'

interface MoveToProjectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (projectId: string) => void
  currentProjectId: string | null
}

export function MoveToProjectModal({
  open,
  onClose,
  onSelect,
  currentProjectId
}: MoveToProjectModalProps): React.JSX.Element | null {
  const projects = useProjectStore((s) => s.projects)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setSelectedIndex(0)
  }, [])

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  const filtered = projects
    .filter((p) => p.id !== currentProjectId)
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))

  const handleSelect = (projectId: string) => {
    onSelect(projectId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (filtered.length > 0) {
        handleSelect(filtered[selectedIndex].id)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[60vh] flex flex-col rounded-xl bg-white dark:bg-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">채팅 이동</h2>
            <p className="text-xs text-neutral-400 mt-0.5">이 채팅을 이동할 프로젝트를 선택하세요.</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 px-4 py-2">
          <Search size={16} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="프로젝트 검색 또는 생성"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-400">
              프로젝트가 없습니다
            </div>
          ) : (
            filtered.map((project, i) => (
              <button
                key={project.id}
                ref={(el) => { itemRefs.current[i] = el }}
                onClick={() => handleSelect(project.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                  selectedIndex === i
                    ? 'bg-neutral-100 dark:bg-neutral-700'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Folder size={16} className="text-neutral-400" />
                <span className="flex-1 truncate">{project.name}</span>
                {selectedIndex === i && <CornerDownLeft size={14} className="text-neutral-400 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
