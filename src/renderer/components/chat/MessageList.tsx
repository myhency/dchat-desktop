import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore } from '../../stores/chat.store'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'

const NEAR_BOTTOM_THRESHOLD = 50

export function MessageList(): React.JSX.Element {
  const messages = useChatStore((s) => s.messages)
  const streamingContent = useChatStore((s) => s.streamingContents[s.currentSessionId ?? ''] ?? '')
  const isStreaming = useChatStore((s) => s.streamingSessionIds.has(s.currentSessionId ?? ''))
  const error = useChatStore((s) => s.error)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const isProgrammaticScrollRef = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const prevMessagesLengthRef = useRef(messages.length)

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
  }, [messages, streamingContent])

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
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
        ))}

        {isStreaming && streamingContent && (
          <MessageBubble role="assistant" content={streamingContent} />
        )}

        {isStreaming && !streamingContent && <StreamingIndicator />}

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
        className={`sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-neutral-700 shadow-lg border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-all ${
          showScrollButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Scroll to bottom"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-neutral-600 dark:text-neutral-300"
        >
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 0 1 .75.75v10.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3.75A.75.75 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}
