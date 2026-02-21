import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chat.store'
import { formatRelativeTime } from '../../lib/time'

export function AllChatsScreen(): React.JSX.Element {
  const sessions = useChatStore((s) => s.sessions)
  const selectSession = useChatStore((s) => s.selectSession)

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = query
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(query.toLowerCase())
      )
    : sessions

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Title */}
        <h1 className="mb-4 text-xl font-semibold text-neutral-800 dark:text-neutral-100">
          채팅
        </h1>

        {/* Search input */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2">
          <span className="text-neutral-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="대화 내용 검색"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Count */}
        <div className="mb-2 text-xs text-neutral-500">
          채팅 {filtered.length}개
        </div>

        {/* Session list */}
        <div className="space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400">
              검색 결과가 없습니다
            </div>
          ) : (
            filtered.map((session) => (
              <button
                key={session.id}
                onClick={() => selectSession(session.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <span className="flex-1 truncate">{session.title}</span>
                <span className="text-xs text-neutral-400 shrink-0">
                  {formatRelativeTime(session.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
