import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Sparkles, ChevronDown, Check, ArrowUp, Plus, X } from 'lucide-react'
import { useChatStore } from '../../stores/chat.store'
import { useSettingsStore } from '../../stores/settings.store'
import { MODEL_META, getShortName } from '../../lib/model-meta'
import { PromptMenu } from '../chat/PromptMenu'

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
  const [modelOpen, setModelOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const createSession = useChatStore((s) => s.createSession)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel)

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setValue('')
    await createSession('New Chat', selectedModel)
    sendMessage(trimmed)
  }, [value, selectedModel, createSession, sendMessage])

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
        <div className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
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
            <div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-neutral-500"
                onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
              >
                {menuAnchor ? <X size={16} /> : <Plus size={16} />}
              </button>
              {menuAnchor && (
                <PromptMenu anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)} />
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
                        <Check size={14} className="text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              className="flex items-center justify-center rounded-lg bg-blue-600 w-8 h-8 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={handleSubmit}
              disabled={!value.trim()}
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
