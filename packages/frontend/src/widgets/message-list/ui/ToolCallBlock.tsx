import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useSessionStore } from '@/entities/session'
import type { ToolCallInfo } from '@/entities/session'

interface ToolCallBlockProps {
  toolCall: ToolCallInfo
  isLast?: boolean
}

function StatusBadge({ status }: { status: ToolCallInfo['status'] }) {
  const base = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium'
  switch (status) {
    case 'done':
      return <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>결과</span>
    case 'calling':
      return (
        <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
          <Loader2 size={10} className="animate-spin" />
          요청 중
        </span>
      )
    case 'confirming':
      return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`}>확인 필요</span>
    case 'error':
      return <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>오류</span>
  }
}

export function ToolCallBlock({ toolCall, isLast }: ToolCallBlockProps): React.JSX.Element {
  const isConfirming = toolCall.status === 'confirming'
  const [expanded, setExpanded] = useState(isConfirming)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const confirmTool = useSessionStore((s) => s.confirmTool)

  const firstLetter = (toolCall.toolName[0] || '?').toUpperCase()

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  // Auto-expand when confirming
  useEffect(() => {
    if (isConfirming) setExpanded(true)
  }, [isConfirming])

  // Keyboard shortcuts when confirming
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault()
        confirmTool(toolCall.toolUseId, true, false)
      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        confirmTool(toolCall.toolUseId, true, true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        confirmTool(toolCall.toolUseId, false)
      }
    },
    [toolCall.toolUseId, confirmTool]
  )

  useEffect(() => {
    if (toolCall.status !== 'confirming') return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toolCall.status, handleKeyDown])

  return (
    <div className="flex items-stretch gap-2.5 px-3">
      {/* Left column: circle icon + connector line */}
      <div className="flex flex-col items-center pt-1.5">
        <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-600 dark:text-neutral-300 shrink-0">
          {firstLetter}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-700 mt-1" />
        )}
      </div>

      {/* Right column: tool info + expanded content */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-3'}`}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left py-1.5 group"
        >
          <span className="font-mono text-xs font-medium truncate text-neutral-700 dark:text-neutral-300">{toolCall.toolName}</span>
          <StatusBadge status={toolCall.status} />
          <span className="flex-1" />
          {expanded
            ? <ChevronDown size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            : <ChevronRight size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          }
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="space-y-2 pb-1">
            {/* Input */}
            <div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">입력</span>
              <pre className="mt-0.5 text-xs font-mono bg-white dark:bg-neutral-900 rounded px-2 py-1.5 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                {Object.keys(toolCall.toolInput).length === 0
                  ? '입력 생성 중...'
                  : JSON.stringify(toolCall.toolInput, null, 2)}
              </pre>
            </div>

            {/* Confirmation buttons */}
            {toolCall.status === 'confirming' && (
              <div className="flex items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <div ref={dropdownRef} className="relative inline-flex">
                  <button
                    type="button"
                    onClick={() => confirmTool(toolCall.toolUseId, true, true)}
                    className="rounded-l-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    항상 허용
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="rounded-r-lg bg-primary px-1.5 py-1.5 text-white hover:bg-primary-600 transition-colors border-l border-white/20"
                  >
                    <ChevronDown size={12} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 z-10 min-w-max rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          confirmTool(toolCall.toolUseId, true, false)
                          setDropdownOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-600 flex items-center gap-2"
                      >
                        한 번만 허용
                        <span className="text-neutral-400 text-[10px] ml-auto">⌘↵</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => confirmTool(toolCall.toolUseId, false)}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                >
                  거부
                  <span className="text-[10px] opacity-60">esc</span>
                </button>
              </div>
            )}

            {/* Result */}
            {toolCall.result !== undefined && (
              <div>
                <span className={`text-xs ${toolCall.isError ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {toolCall.isError ? '오류' : '결과'}
                </span>
                <pre className={`mt-0.5 text-xs font-mono rounded px-2 py-1.5 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap ${
                  toolCall.isError
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-white dark:bg-neutral-900'
                }`}>
                  {toolCall.result}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
