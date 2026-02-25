import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { useSessionStore, type StreamingSegment } from '@/entities/session'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'
import { ToolCallBlock } from './ToolCallBlock'

const NEAR_BOTTOM_THRESHOLD = 50
const EMPTY_SEGMENTS: StreamingSegment[] = []

export function MessageList(): React.JSX.Element {
  const messages = useSessionStore((s) => s.messages)
  const streamingSegments = useSessionStore((s) => s.streamingSegments[s.currentSessionId ?? ''] ?? EMPTY_SEGMENTS)
  const isStreaming = useSessionStore((s) => s.streamingSessionIds.has(s.currentSessionId ?? ''))
  const error = useSessionStore((s) => s.error)
  const regenerateMessage = useSessionStore((s) => s.regenerateMessage)
  const editMessage = useSessionStore((s) => s.editMessage)
  const openArtifact = useSessionStore((s) => s.openArtifact)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const isProgrammaticScrollRef = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const prevMessagesLengthRef = useRef(messages.length)
  const prevStreamingRef = useRef(false)

  // Auto-open artifact panel when streaming finishes with HTML code block
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'assistant' && lastMsg.content) {
        const htmlMatch = /```html\n([\s\S]*?)```/.exec(lastMsg.content)
        if (htmlMatch) {
          const code = htmlMatch[1].replace(/\n$/, '')
          const title = /<title>(.*?)<\/title>/i.exec(code)?.[1] || 'HTML'
          openArtifact(code, title)
        }
      }
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, messages, openArtifact])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      const el = scrollContainerRef.current
      if (el) el.scrollTo({ top: el.scrollTop })  // cancel in-flight smooth animation
      isProgrammaticScrollRef.current = false
      isNearBottomRef.current = false
      setShowScrollButton(true)
    }
  }, [])

  const lastScrollTopRef = useRef(0)

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - NEAR_BOTTOM_THRESHOLD
    const scrolledUp = el.scrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = el.scrollTop

    if (isProgrammaticScrollRef.current) {
      if (nearBottom) isProgrammaticScrollRef.current = false
      return
    }

    if (scrolledUp) {
      isNearBottomRef.current = false
      setShowScrollButton(true)
    } else if (nearBottom) {
      isNearBottomRef.current = true
      setShowScrollButton(false)
    }
  }, [])

  // Auto-scroll on streaming content — only when user is near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      const el = scrollContainerRef.current
      if (el) {
        isProgrammaticScrollRef.current = false
        el.scrollTo({ top: el.scrollHeight })
      }
    }
  }, [messages, streamingSegments])

  // Force scroll to bottom when a new message is added (user sends a message)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'user') {
        isProgrammaticScrollRef.current = true
        isNearBottomRef.current = true
        setShowScrollButton(false)
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length])

  const scrollToBottom = useCallback(() => {
    isProgrammaticScrollRef.current = true
    isNearBottomRef.current = true
    setShowScrollButton(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className="flex-1 overflow-y-auto relative"
    >
      <div className="max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full py-6 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
            Start a conversation
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            id={msg.id}
            role={msg.role}
            content={msg.content}
            createdAt={msg.createdAt}
            onRegenerate={regenerateMessage}
            onEdit={editMessage}
            attachments={msg.attachments}
          />
        ))}

        {isStreaming && streamingSegments.length > 0 && streamingSegments.map((seg, i) => {
          if (seg.type === 'text') {
            const isLastText = !streamingSegments.slice(i + 1).some((s) => s.type === 'text')
            return (
              <MessageBubble
                key={`stream-text-${i}`}
                role="assistant"
                content={seg.content}
                isStreaming={isLastText}
              />
            )
          }
          return <ToolCallBlock key={seg.toolCall.toolUseId} toolCall={seg.toolCall} />
        })}

        {isStreaming && streamingSegments.length === 0 && <StreamingIndicator />}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <button
        type="button"
        onClick={scrollToBottom}
        className={`sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-lg bg-white dark:bg-neutral-700 shadow-lg border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-all ${
          showScrollButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Scroll to bottom"
      >
        <ArrowDown size={16} className="text-neutral-600 dark:text-neutral-300" />
      </button>
    </div>
  )
}
