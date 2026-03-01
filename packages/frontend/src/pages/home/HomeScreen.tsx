import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Sparkles, ChevronDown, Check, ArrowUp, Plus, X, FolderOpen, FileText } from 'lucide-react'
import { useSessionStore, type ImageAttachment } from '@/entities/session'
import { useSettingsStore } from '@/entities/settings'
import { MODEL_META, getShortName } from '@/shared/lib/model-meta'
import { PromptMenu } from '@/widgets/prompt-input'

const QUICK_ACTIONS = [
  { label: '작성하기', prompt: '다음 내용을 작성해 주세요: ' },
  { label: '학습하기', prompt: '다음 주제에 대해 알려주세요: ' },
  { label: '코드', prompt: '다음 코드를 작성해 주세요: ' },
  { label: '일상생활', prompt: '일상생활에 도움이 필요합니다: ' },
  { label: 'Claude의 선택', prompt: '오늘 흥미로운 이야기를 들려주세요.' }
] as const

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return '좋은 아침입니다'
  if (hour >= 12 && hour < 18) return '좋은 오후입니다'
  return '좋은 저녁입니다'
}

export function HomeScreen(): React.JSX.Element {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null)
  const [modelOpen, setModelOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const createSession = useSessionStore((s) => s.createSession)
  const sendMessage = useSessionStore((s) => s.sendMessage)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel)

  const handleAttach = useCallback((picked: ImageAttachment[]) => {
    setAttachments((prev) => [...prev, ...picked])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleProjectSelect = useCallback((projectId: string, projectName: string) => {
    setSelectedProject({ id: projectId, name: projectName })
  }, [])

  const handleProjectRemove = useCallback(() => {
    setSelectedProject(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed && attachments.length === 0) return
    const currentAttachments = attachments
    const currentProject = selectedProject
    setValue('')
    setAttachments([])
    setSelectedProject(null)
    try {
      await createSession('New Chat', selectedModel, currentProject?.id)
      sendMessage(trimmed, currentAttachments.length > 0 ? currentAttachments : undefined)
    } catch (err) {
      console.error('Failed to create session:', err)
      setValue(trimmed)
      setAttachments(currentAttachments)
      setSelectedProject(currentProject)
      alert(err instanceof Error ? err.message : 'Failed to create session')
    }
  }, [value, attachments, selectedProject, selectedModel, createSession, sendMessage])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleQuickAction = useCallback(
    (prompt: string) => {
      setValue(prompt)
      textareaRef.current?.focus()
    },
    []
  )

  // click-outside for model dropdown
  useEffect(() => {
    if (!modelOpen) return
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [modelOpen])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Greeting */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Sparkles size={32} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            {getGreeting()}
          </h1>
        </div>

        {/* Input area */}
        <div className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400">
          {attachments.length > 0 && (
            <div className="flex gap-2 px-3 pt-2 overflow-x-auto">
              {attachments.map((a) => (
                <div key={a.id} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-600">
                  {a.mimeType.startsWith('image/') ? (
                    <img src={`data:${a.mimeType};base64,${a.base64Data}`} alt={a.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-neutral-100 dark:bg-neutral-700">
                      <FileText size={20} className="text-neutral-500 dark:text-neutral-400" />
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1 truncate w-full text-center">{a.fileName}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <TextareaAutosize
            ref={textareaRef}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none border-none placeholder:text-neutral-400"
            placeholder="오늘 어떤 도움을 드릴까요?"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            maxRows={8}
            minRows={2}
          />
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-neutral-500"
                onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
              >
                {menuAnchor ? <X size={16} /> : <Plus size={16} />}
              </button>
              {menuAnchor && (
                <PromptMenu anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)} onAttach={handleAttach} onProjectSelect={handleProjectSelect} />
              )}
              {selectedProject && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
                  <FolderOpen size={12} className="text-neutral-400 shrink-0" />
                  <span className="max-w-[120px] truncate" title={selectedProject.name}>{selectedProject.name}</span>
                  <button
                    onClick={handleProjectRemove}
                    className="ml-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
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
              disabled={!value.trim() && attachments.length === 0}
            >
              <ArrowUp size={16} />
            </button>
            </div>
          </div>
        </div>

        {/* Quick action chips */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
