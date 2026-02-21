import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Square, ArrowUp, Plus, X } from 'lucide-react'
import { useChatStore } from '../../stores/chat.store'
import { ModelSelector } from './ModelSelector'
import { PromptMenu } from './PromptMenu'

export function PromptInput(): React.JSX.Element {
  const [value, setValue] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const stopStream = useChatStore((s) => s.stopStream)
  const isStreaming = useChatStore((s) => s.streamingSessionIds.has(s.currentSessionId ?? ''))
  const currentSessionId = useChatStore((s) => s.currentSessionId)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || !currentSessionId) return
    sendMessage(trimmed)
    setValue('')
  }, [value, isStreaming, currentSessionId, sendMessage])

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
    textareaRef.current?.focus()
  }, [currentSessionId])

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 py-4">
      <div className="max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
        <TextareaAutosize
          ref={textareaRef}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none border-none placeholder:text-neutral-400"
          placeholder={
            currentSessionId
              ? 'Enter a message...'
              : 'Create a session to start'
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          maxRows={8}
          minRows={1}
          disabled={!currentSessionId}
        />
        <div className="flex items-center justify-between px-2 py-1.5">
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
            <ModelSelector />
            {isStreaming ? (
              <button
                className="flex items-center justify-center rounded-lg bg-neutral-500 w-8 h-8 text-white hover:bg-neutral-600 transition-colors"
                onClick={stopStream}
              >
                <Square size={16} fill="currentColor" stroke="none" />
              </button>
            ) : (
              <button
                className="flex items-center justify-center rounded-lg bg-blue-600 w-8 h-8 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={handleSubmit}
                disabled={!value.trim() || !currentSessionId}
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
