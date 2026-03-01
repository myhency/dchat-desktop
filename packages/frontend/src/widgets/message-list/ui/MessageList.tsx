import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown } from 'lucide-react'
import { useSessionStore, type StreamingSegment, type ToolCallInfo } from '@/entities/session'
import type { MessageSegment } from '@dchat/shared'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'
import { ToolCallGroup } from './ToolCallGroup'

const NEAR_BOTTOM_THRESHOLD = 50
const EMPTY_SEGMENTS: StreamingSegment[] = []

// Group consecutive tool segments together
type GroupedSegment =
  | { type: 'text'; content: string; index: number }
  | { type: 'toolGroup'; toolCalls: ToolCallInfo[]; startIndex: number }

function groupSavedSegments(segments: MessageSegment[]): GroupedSegment[] {
  const result: GroupedSegment[] = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.type === 'text') {
      result.push({ type: 'text', content: seg.content, index: i })
    } else {
      const tc: ToolCallInfo = {
        toolUseId: seg.toolUseId,
        toolName: seg.toolName,
        toolInput: seg.toolInput,
        status: seg.isError ? 'error' : 'done',
        result: seg.result,
        isError: seg.isError
      }
      const last = result[result.length - 1]
      if (last?.type === 'toolGroup') {
        last.toolCalls.push(tc)
      } else {
        result.push({ type: 'toolGroup', toolCalls: [tc], startIndex: i })
      }
    }
  }
  return result
}

function groupStreamingSegments(segments: StreamingSegment[]): GroupedSegment[] {
  const result: GroupedSegment[] = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.type === 'text') {
      result.push({ type: 'text', content: seg.content, index: i })
    } else {
      const last = result[result.length - 1]
      if (last?.type === 'toolGroup') {
        last.toolCalls.push(seg.toolCall)
      } else {
        result.push({ type: 'toolGroup', toolCalls: [seg.toolCall], startIndex: i })
      }
    }
  }
  return result
}

export function MessageList(): React.JSX.Element {
  const messages = useSessionStore((s) => s.messages)
  const streamingSegments = useSessionStore((s) => s.streamingSegments[s.currentSessionId ?? ''] ?? EMPTY_SEGMENTS)
  const isStreaming = useSessionStore((s) => s.streamingSessionIds.has(s.currentSessionId ?? ''))
  const error = useSessionStore((s) => s.error)
  const regenerateMessage = useSessionStore((s) => s.regenerateMessage)
  const editMessage = useSessionStore((s) => s.editMessage)
  const openArtifact = useSessionStore((s) => s.openArtifact)

  const groupedByMessage = useMemo(() => {
    const map = new Map<string, GroupedSegment[]>()
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.segments?.length) {
        map.set(msg.id, groupSavedSegments(msg.segments))
      }
    }
    return map
  }, [messages])

  const groupedStreaming = useMemo(
    () => streamingSegments.length > 0 ? groupStreamingSegments(streamingSegments) : [],
    [streamingSegments]
  )

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const isProgrammaticScrollRef = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const prevMessagesLengthRef = useRef(messages.length)
  const prevStreamingRef = useRef(false)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

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

    if (nearBottom) {
      isNearBottomRef.current = true
      setShowScrollButton(false)
    } else if (scrolledUp) {
      isNearBottomRef.current = false
      setShowScrollButton(true)
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
        virtualizer.scrollToIndex(messages.length - 1, { align: 'start', behavior: 'smooth' })
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length, virtualizer])

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
      <div className="max-w-[90%] md:max-w-[80%] lg:max-w-[70%] mx-auto w-full py-6">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
            Start a conversation
          </div>
        )}

        {messages.length > 0 && (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const msg = messages[virtualRow.index]
              const grouped = groupedByMessage.get(msg.id)

              return (
                <div
                  key={msg.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    {grouped ? (
                      <div className="space-y-2">
                        {grouped.map((g, i) => {
                          if (g.type === 'text') {
                            const isLastText = !grouped.slice(i + 1).some((gg) => gg.type === 'text')
                            return (
                              <MessageBubble
                                key={`${msg.id}-seg-${g.index}`}
                                role="assistant"
                                content={g.content}
                                {...(isLastText ? { id: msg.id, createdAt: msg.createdAt, onRegenerate: regenerateMessage } : {})}
                              />
                            )
                          }
                          return (
                            <ToolCallGroup
                              key={`${msg.id}-toolgroup-${g.startIndex}`}
                              toolCalls={g.toolCalls}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <MessageBubble
                        id={msg.id}
                        role={msg.role}
                        content={msg.content}
                        createdAt={msg.createdAt}
                        onRegenerate={regenerateMessage}
                        onEdit={editMessage}
                        attachments={msg.attachments}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isStreaming && groupedStreaming.length > 0 && (
          <div className="space-y-4">
            {groupedStreaming.map((g, i) => {
              if (g.type === 'text') {
                const isLastText = !groupedStreaming.slice(i + 1).some((gg) => gg.type === 'text')
                return (
                  <MessageBubble
                    key={`stream-text-${g.index}`}
                    role="assistant"
                    content={g.content}
                    isStreaming={isLastText}
                  />
                )
              }
              return (
                <ToolCallGroup
                  key={`stream-toolgroup-${g.startIndex}`}
                  toolCalls={g.toolCalls}
                  isStreaming
                />
              )
            })}
          </div>
        )}

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
