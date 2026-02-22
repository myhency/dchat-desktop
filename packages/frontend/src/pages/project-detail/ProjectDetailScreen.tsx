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
  Upload
} from 'lucide-react'
import { useProjectStore } from '@/entities/project'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedProjectId) {
      sessionApi.listByProject(selectedProjectId).then(setProjectSessions)
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
    </div>
  )
}
