import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useChatStore } from '../../stores/chat.store'
import { ModelSelector } from './ModelSelector'

export function PromptInput(): React.JSX.Element {
  const [value, setValue] = useState('')
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
          <div>{/* future tool buttons */}</div>
          <div className="flex items-center gap-2">
            <ModelSelector />
            {isStreaming ? (
              <button
                className="flex items-center justify-center rounded-lg bg-neutral-500 w-8 h-8 text-white hover:bg-neutral-600 transition-colors"
                onClick={stopStream}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/>
                </svg>
              </button>
            ) : (
              <button
                className="flex items-center justify-center rounded-lg bg-blue-600 w-8 h-8 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={handleSubmit}
                disabled={!value.trim() || !currentSessionId}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
