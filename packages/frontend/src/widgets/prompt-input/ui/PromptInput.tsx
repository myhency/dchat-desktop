import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Square, ArrowUp, Plus, X } from 'lucide-react'
import { useSessionStore, type ImageAttachment } from '@/entities/session'
import { ModelSelector } from './ModelSelector'
import { PromptMenu } from './PromptMenu'

export function PromptInput(): React.JSX.Element {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useSessionStore((s) => s.sendMessage)
  const stopStream = useSessionStore((s) => s.stopStream)
  const isStreaming = useSessionStore((s) => s.streamingSessionIds.has(s.currentSessionId ?? ''))
  const currentSessionId = useSessionStore((s) => s.currentSessionId)

  const handleAttach = useCallback((picked: ImageAttachment[]) => {
    setAttachments((prev) => [...prev, ...picked])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && attachments.length === 0) || isStreaming || !currentSessionId) return
    sendMessage(trimmed, attachments.length > 0 ? attachments : undefined)
    setValue('')
    setAttachments([])
  }, [value, attachments, isStreaming, currentSessionId, sendMessage])

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
        {attachments.length > 0 && (
          <div className="flex gap-2 px-3 pt-2 overflow-x-auto">
            {attachments.map((a) => (
              <div key={a.id} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-600">
                <img src={`data:${a.mimeType};base64,${a.base64Data}`} alt={a.fileName} className="w-full h-full object-cover" />
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
              <PromptMenu anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)} onAttach={handleAttach} />
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
                disabled={(!value.trim() && attachments.length === 0) || !currentSessionId}
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
