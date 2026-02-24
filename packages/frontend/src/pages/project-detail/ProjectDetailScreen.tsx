import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import type { Session } from '@/entities/session'
import { sessionApi } from '@/entities/session'
import TextareaAutosize from 'react-textarea-autosize'
import {
  ArrowLeft,
  MoreHorizontal,
  Star,
  ChevronDown,
  Check,
  ArrowUp,
  Plus,
  FileText,
  Upload,
  Brain,
  Trash2,
  ArrowRight,
  Loader2,
  X,
  Pencil
} from 'lucide-react'
import { useProjectStore, projectApi } from '@/entities/project'
import { useSessionStore } from '@/entities/session'
import { useSettingsStore } from '@/entities/settings'
import { ProjectContextMenu } from '@/features/manage-project'
import { formatRelativeTime } from '@/shared/lib/time'
import { MODEL_META, getShortName } from '@/shared/lib/model-meta'

export function ProjectDetailScreen(): React.JSX.Element {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const projects = useProjectStore((s) => s.projects)
  const deselectProject = useProjectStore((s) => s.deselectProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite)
  const updateProject = useProjectStore((s) => s.updateProject)

  const createSession = useSessionStore((s) => s.createSession)
  const selectSession = useSessionStore((s) => s.selectSession)
  const sendMessage = useSessionStore((s) => s.sendMessage)

  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel)

  const updateInstructions = useProjectStore((s) => s.updateInstructions)

  const project = projects.find((p) => p.id === selectedProjectId)

  const [value, setValue] = useState('')
  const [isEditingInstructions, setIsEditingInstructions] = useState(false)
  const [instructionsDraft, setInstructionsDraft] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [projectSessions, setProjectSessions] = useState<Session[]>([])
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [memoryContent, setMemoryContent] = useState('')
  const [memoryUpdatedAt, setMemoryUpdatedAt] = useState<string | null>(null)
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const [deleteMemoryModalOpen, setDeleteMemoryModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedProjectId) {
      sessionApi.listByProject(selectedProjectId).then(setProjectSessions)
      projectApi.getMemory(selectedProjectId).then((data) => {
        setMemoryContent(data.content)
        setMemoryUpdatedAt(data.updatedAt)
      }).catch(() => {})
    }
  }, [selectedProjectId])

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setValue('')
    await createSession('New Chat', selectedModel, selectedProjectId)
    sendMessage(trimmed)
  }, [value, selectedModel, selectedProjectId, createSession, sendMessage])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  useEffect(() => {
    if (!modelOpen) return
    const handler = (e: MouseEvent): void => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [modelOpen])

  if (!project) {
    deselectProject()
    return <></>
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-2xl">
          {/* Back button */}
          <button
            onClick={deselectProject}
            className="mb-4 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            <ArrowLeft size={16} />
            모든 프로젝트
          </button>

          {/* Title bar */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
              {project.name}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                onClick={() => toggleFavorite(project.id)}
                className={`rounded-lg p-1.5 transition-colors ${
                  project.isFavorite
                    ? 'text-yellow-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-200'
                }`}
              >
                <Star size={16} fill={project.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {menuAnchor && (
            <ProjectContextMenu
              anchorEl={menuAnchor}
              isFavorite={project.isFavorite}
              showFavorite={false}
              onToggleFavorite={() => setMenuAnchor(null)}
              onEditDetails={() => {
                setNameDraft(project.name)
                setDescriptionDraft(project.description)
                setIsEditingDetails(true)
                setMenuAnchor(null)
              }}
              onDelete={() => {
                deleteProject(project.id)
                deselectProject()
                setMenuAnchor(null)
              }}
              onClose={() => setMenuAnchor(null)}
            />
          )}

          {isEditingDetails && (
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
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:focus:border-neutral-400"
                />
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  설명
                </label>
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={4}
                  className="mb-6 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:focus:border-neutral-400 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDetails(false)}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    disabled={!nameDraft.trim()}
                    onClick={() => {
                      updateProject(project.id, nameDraft.trim(), descriptionDraft.trim())
                      setIsEditingDetails(false)
                    }}
                    className="rounded-lg bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="mb-8 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400">
            <TextareaAutosize
              ref={textareaRef}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none border-none placeholder:text-neutral-400"
              placeholder="답글..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              maxRows={8}
              minRows={2}
            />
            <div className="flex items-center justify-between px-3 py-2">
              <div>{/* future tool buttons */}</div>
              <div className="flex items-center gap-2">
                {/* Model selector */}
                <div ref={modelRef} className="relative">
                  <button
                    onClick={() => setModelOpen((o) => !o)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    {getShortName(selectedModel)}
                    <ChevronDown size={12} className={`transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {modelOpen && (
                    <div className="absolute bottom-full mb-1 right-0 z-50 min-w-[200px] rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg py-1">
                      {Object.keys(MODEL_META).map((modelId) => (
                        <button
                          key={modelId}
                          onClick={() => {
                            setSelectedModel(modelId)
                            setModelOpen(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-between"
                        >
                          <span>{getShortName(modelId)}</span>
                          {modelId === selectedModel && (
                            <Check size={14} className="text-primary-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Send button */}
                <button
                  className="flex items-center justify-center rounded-lg bg-primary w-8 h-8 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={handleSubmit}
                  disabled={!value.trim()}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Session list */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
              채팅
            </h2>
            <div className="border-t border-neutral-200 dark:border-neutral-700" />
            {projectSessions.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-400">
                아직 이 프로젝트에 연결된 채팅이 없습니다
              </div>
            ) : (
              <div>
                {projectSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => selectSession(session.id)}
                    className="flex w-full items-center justify-between px-2 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <span className="truncate text-neutral-800 dark:text-neutral-100">
                      {session.title}
                    </span>
                    <span className="shrink-0 ml-2 text-xs text-neutral-400">
                      {formatRelativeTime(session.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-[280px] shrink-0 border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto px-4 py-6">
        {/* Instructions card */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              지침
            </h3>
            {!isEditingInstructions && (
              <button
                onClick={() => {
                  setInstructionsDraft(project.instructions || '')
                  setIsEditingInstructions(true)
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          {isEditingInstructions ? (
            <div>
              <textarea
                className="w-full resize-none rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                rows={5}
                value={instructionsDraft}
                onChange={(e) => setInstructionsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditingInstructions(false)
                  }
                }}
                autoFocus
                placeholder="이 프로젝트에서 Claude가 따를 지침을 입력하세요..."
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingInstructions(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    await updateInstructions(project.id, instructionsDraft)
                    setIsEditingInstructions(false)
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          ) : project.instructions ? (
            <p
              className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap cursor-pointer rounded-lg p-1 -m-1 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
              onClick={() => {
                setInstructionsDraft(project.instructions)
                setIsEditingInstructions(true)
              }}
            >
              {project.instructions}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Claude의 응답을 맞춤화하는 지침 추가
            </p>
          )}
        </div>

        {/* Project Memory card */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              프로젝트 기억
            </h3>
            {memoryContent && (
              <button
                onClick={() => setMemoryModalOpen(true)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          {memoryContent ? (
            <div>
              <button
                onClick={() => setMemoryModalOpen(true)}
                className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                  {memoryContent.replace(/^##.*$/gm, '').trim().slice(0, 100)}
                </p>
                {memoryUpdatedAt && (
                  <p className="mt-2 text-xs text-neutral-400">
                    마지막 업데이트: {formatRelativeTime(memoryUpdatedAt)}
                  </p>
                )}
              </button>
              <button
                onClick={() => setDeleteMemoryModalOpen(true)}
                className="mt-1 text-xs text-neutral-400 hover:text-red-500 transition-colors"
              >
                초기화
              </button>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              이 프로젝트의 대화에서 자동으로 기억이 생성됩니다
            </p>
          )}
        </div>

        {/* Files card */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              파일
            </h3>
            <button className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700 py-6 text-neutral-400">
            <Upload size={20} className="mb-2" />
            <p className="text-xs">파일을 여기에 끌어다 놓으세요</p>
          </div>
        </div>
      </div>

      {/* Project Memory Modals */}
      <ProjectMemoryManageModal
        open={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        memoryContent={memoryContent}
        onMemoryChange={(content, updatedAt) => {
          setMemoryContent(content)
          setMemoryUpdatedAt(updatedAt)
        }}
        projectId={project.id}
      />
      <DeleteProjectMemoryModal
        open={deleteMemoryModalOpen}
        onClose={() => setDeleteMemoryModalOpen(false)}
        onConfirm={async () => {
          await projectApi.deleteMemory(project.id)
          setMemoryContent('')
          setMemoryUpdatedAt(null)
          setDeleteMemoryModalOpen(false)
        }}
      />
    </div>
  )
}

// ── Local Modals ──

function ProjectMemoryManageModal({
  open,
  onClose,
  memoryContent,
  onMemoryChange,
  projectId
}: {
  open: boolean
  onClose: () => void
  memoryContent: string
  onMemoryChange: (content: string, updatedAt: string) => void
  projectId: string
}): React.JSX.Element | null {
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, loading])

  if (!open) return null

  const sections = memoryContent
    ? memoryContent.split(/^(?=## )/m).filter((s) => s.trim())
    : []

  const handleSubmit = async () => {
    if (!instruction.trim() || loading) return
    setLoading(true)
    try {
      const result = await projectApi.editMemory(projectId, { instruction: instruction.trim(), model: selectedModel })
      onMemoryChange(result.content, result.updatedAt!)
      setInstruction('')
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!loading) onClose() }}>
      <div className="w-[560px] max-h-[80vh] flex flex-col rounded-xl bg-white dark:bg-neutral-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-base font-semibold">프로젝트 기억 관리</h2>
          <button
            type="button"
            onClick={() => { if (!loading) onClose() }}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-6 pb-4 text-sm text-neutral-500 dark:text-neutral-400">
          이 프로젝트에 대해 기억하고 있는 내용입니다
        </p>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {sections.length === 0 ? (
            <div className="text-center py-8 text-sm text-neutral-400 dark:text-neutral-500">
              저장된 프로젝트 기억이 없습니다
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
              {sections.map((section, i) => {
                const lines = section.trim().split('\n')
                const header = lines[0].replace(/^## /, '')
                const body = lines.slice(1).join('\n').trim()
                return (
                  <div key={i}>
                    <p className="text-sm font-semibold mb-1">{header}</p>
                    {body && <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{body}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSubmit() }}
              placeholder="이 프로젝트에 대해 기억하거나 잊어야 할 것을 알려주세요..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!instruction.trim() || loading}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteProjectMemoryModal({
  open,
  onClose,
  onConfirm
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[420px] rounded-xl bg-white dark:bg-neutral-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-2">프로젝트 기억 초기화</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          이 프로젝트의 기억이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            기억 초기화
          </button>
        </div>
      </div>
    </div>
  )
}
