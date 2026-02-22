import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MessageSquare, CornerDownLeft } from 'lucide-react'
import { useChatStore } from '../../stores/chat.store'
import { formatRelativeTime } from '../../lib/time'

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SearchModal(): React.JSX.Element | null {
  const searchOpen = useChatStore((s) => s.searchOpen)
  const closeSearch = useChatStore((s) => s.closeSearch)
  const sessions = useChatStore((s) => s.sessions)
  const selectSession = useChatStore((s) => s.selectSession)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setSelectedIndex(0)
      // requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [searchOpen])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setSelectedIndex(0)
  }, [])

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!searchOpen) return null

  const filtered = query
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(query.toLowerCase())
      )
    : sessions

  const handleSelect = (id: string) => {
    selectSession(id)
    closeSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch()
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
      onClick={closeSearch}
    >
      <div
        className="w-[480px] max-h-[60vh] flex flex-col rounded-xl bg-white dark:bg-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <Search size={16} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="채팅 검색..."
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
          <button
            onClick={closeSearch}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs ml-1"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-400">
              검색 결과가 없습니다
            </div>
          ) : (
            <>
              {query && (
                <div className="text-xs text-neutral-400 px-4 py-2">검색 결과</div>
              )}
              {filtered.map((session, i) => (
                <button
                  key={session.id}
                  ref={(el) => { itemRefs.current[i] = el }}
                  onClick={() => handleSelect(session.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                    selectedIndex === i
                      ? 'bg-neutral-100 dark:bg-neutral-700'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <MessageSquare size={16} className="text-neutral-400" />
                  <span className="flex-1 truncate">
                    {query ? highlightMatch(session.title, query) : session.title}
                  </span>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {selectedIndex === i ? <CornerDownLeft size={14} /> : formatRelativeTime(session.updatedAt)}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
