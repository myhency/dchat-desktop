import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { ArrowUp } from 'lucide-react'
import { useSettingsStore } from '@/entities/settings'
import { getShortName } from '@/shared/lib/model-meta'

export function QuickChatPage(): React.JSX.Element {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedModel = useSettingsStore((s) => s.selectedModel)

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      await (window as any).electron.sendQuickChat(trimmed, selectedModel)
      setValue('')
    } catch (err) {
      console.error('Quick chat send failed:', err)
    } finally {
      setSending(false)
    }
  }, [value, sending, selectedModel])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        window.close()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="flex h-screen flex-col rounded-xl bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl">
      <div className="flex-1 px-3 pt-3">
        <TextareaAutosize
          ref={textareaRef}
          className="w-full resize-none bg-transparent px-1 py-1 text-sm outline-none border-none placeholder:text-neutral-400"
          placeholder="메시지를 입력하세요..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          maxRows={4}
          minRows={1}
          disabled={sending}
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {getShortName(selectedModel)}
        </span>
        <button
          className="flex items-center justify-center rounded-lg bg-primary w-7 h-7 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          onClick={handleSubmit}
          disabled={!value.trim() || sending}
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  )
}
