import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Check, MoreHorizontal } from 'lucide-react'
import { useProjectStore, type Project } from '@/entities/project'
import { ProjectContextMenu } from '@/features/manage-project'
import { formatRelativeTime } from '@/shared/lib/time'

const SORT_OPTIONS = [
  { key: 'activity', label: '최근 활동', buttonLabel: '활동' },
  { key: 'modified', label: '마지막 수정', buttonLabel: '수정' },
  { key: 'created', label: '생성 날짜', buttonLabel: '날짜' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

export function ProjectsScreen(): React.JSX.Element {
  const projects = useProjectStore((s) => s.projects)
  const createProject = useProjectStore((s) => s.createProject)
  const selectProject = useProjectStore((s) => s.selectProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite)
  const updateProject = useProjectStore((s) => s.updateProject)

  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('activity')
  const [sortOpen, setSortOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; projectId: string } | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent): void => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortOpen])

  const filtered = query
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      )
    : projects

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Title + New button */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
            프로젝트
          </h1>
          <button
            onClick={() => {
              setName('')
              setDescription('')
              setCreating(true)
            }}
            className="rounded-lg bg-neutral-800 dark:bg-neutral-100 px-3 py-1.5 text-sm text-white dark:text-neutral-900 hover:opacity-80 transition-opacity"
          >
            + 새 프로젝트
          </button>
        </div>

        {creating ? (
          <div className="mx-auto max-w-lg pt-8">
            <h2 className="mb-6 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              개인 프로젝트 생성
            </h2>

            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              무엇을 작업 중이신가요?
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름 지정"
              className="mb-4 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:focus:border-neutral-400"
            />

            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              어떤 목표를 달성하려고 하시나요?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트, 목표, 주제 등을 설명해주세요."
              rows={4}
              className="mb-6 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:focus:border-neutral-400 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCreating(false)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                취소
              </button>
              <button
                disabled={!name.trim()}
                onClick={() => {
                  createProject(name.trim(), description.trim())
                  setCreating(false)
                }}
                className="rounded-lg bg-neutral-800 dark:bg-neutral-100 px-4 py-1.5 text-sm text-white dark:text-neutral-900 hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                프로젝트 만들기
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search input */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2">
              <Search size={16} className="text-neutral-400" />
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
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-neutral-500">정렬 기준</span>
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-2.5 py-0.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1"
                >
                  {SORT_OPTIONS.find((o) => o.key === sortBy)!.buttonLabel}
                  <ChevronDown size={12} />
                </button>
                {sortOpen && (
                  <div className="absolute left-0 top-full mt-1 z-10 min-w-[140px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1 shadow-lg">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortBy(opt.key)
                          setSortOpen(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <span className="w-4 text-center">
                          {sortBy === opt.key ? <Check size={14} /> : ''}
                        </span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project card grid */}
            {sorted.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-400">
                {query ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {sorted.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                    className="group relative cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuAnchor({ el: e.currentTarget, projectId: project.id })
                      }}
                      className="absolute right-2 top-2 rounded-lg p-1 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <div className="font-medium text-sm text-neutral-800 dark:text-neutral-100 truncate pr-6">
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
                  </div>
                ))}
              </div>
            )}
            {menuAnchor && (
              <ProjectContextMenu
                anchorEl={menuAnchor.el}
                isFavorite={projects.find((p) => p.id === menuAnchor.projectId)?.isFavorite ?? false}
                showFavorite
                onToggleFavorite={() => {
                  toggleFavorite(menuAnchor.projectId)
                  setMenuAnchor(null)
                }}
                onEditDetails={() => {
                  const target = projects.find((p) => p.id === menuAnchor.projectId)
                  if (target) {
                    setEditingProject(target)
                    setEditName(target.name)
                    setEditDescription(target.description)
                  }
                  setMenuAnchor(null)
                }}
                onDelete={() => {
                  deleteProject(menuAnchor.projectId)
                  setMenuAnchor(null)
                }}
                onClose={() => setMenuAnchor(null)}
              />
            )}

            {editingProject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-800 p-6 shadow-xl border border-neutral-200 dark:border-neutral-700">
                  <h2 className="mb-4 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                    세부사항 수정
                  </h2>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    프로젝트 이름
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mb-4 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:focus:border-neutral-400"
                  />
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    설명
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="mb-6 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:focus:border-neutral-400 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingProject(null)}
                      className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      disabled={!editName.trim()}
                      onClick={() => {
                        updateProject(editingProject.id, editName.trim(), editDescription.trim())
                        setEditingProject(null)
                      }}
                      className="rounded-lg bg-neutral-800 dark:bg-neutral-100 px-4 py-1.5 text-sm text-white dark:text-neutral-900 hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
