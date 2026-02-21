import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '../../stores/project.store'
import { formatRelativeTime } from '../../lib/time'

export function ProjectsScreen(): React.JSX.Element {
  const projects = useProjectStore((s) => s.projects)
  const createProject = useProjectStore((s) => s.createProject)

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = query
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      )
    : projects

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Title + New button */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
            프로젝트
          </h1>
          <button
            onClick={() => createProject('새 프로젝트', '')}
            className="rounded-lg bg-neutral-800 dark:bg-neutral-100 px-3 py-1.5 text-sm text-white dark:text-neutral-900 hover:opacity-80 transition-opacity"
          >
            + 새 프로젝트
          </button>
        </div>

        {/* Search input */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2">
          <span className="text-neutral-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프로젝트 검색"
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

        {/* Sort label */}
        <div className="mb-2 text-xs text-neutral-500">
          정렬 기준 | 활동
        </div>

        {/* Project card grid */}
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-neutral-400">
            {query ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((project) => (
              <button
                key={project.id}
                className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
              >
                <div className="font-medium text-sm text-neutral-800 dark:text-neutral-100 truncate">
                  {project.name}
                </div>
                {project.description && (
                  <div className="mt-1 text-xs text-neutral-500 truncate">
                    {project.description}
                  </div>
                )}
                <div className="mt-2 text-xs text-neutral-400">
                  {formatRelativeTime(project.updatedAt)} 업데이트됨
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
