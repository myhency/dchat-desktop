import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Loader2, Check, X, Shield, RefreshCw } from 'lucide-react'
import { useSessionStore } from '@/entities/session'
import type { ToolCallInfo } from '@/entities/session'

interface ToolCallBlockProps {
  toolCall: ToolCallInfo
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps): React.JSX.Element {
  const isConfirming = toolCall.status === 'confirming'
  const [expanded, setExpanded] = useState(isConfirming)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const confirmTool = useSessionStore((s) => s.confirmTool)

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
    <div className={`my-2 rounded-lg border text-sm ${
      isConfirming
        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
        : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50'
    }`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
      >
        {/* Status icon */}
        {toolCall.status === 'confirming' && (
          <Shield size={14} className="shrink-0 text-amber-500" />
        )}
        {toolCall.status === 'calling' && (
          <Loader2 size={14} className="shrink-0 text-blue-500 animate-spin" />
        )}
        {toolCall.status === 'done' && (
          <Check size={14} className="shrink-0 text-green-500" />
        )}
        {toolCall.status === 'error' && (
          <X size={14} className="shrink-0 text-red-500" />
        )}

        <span className="font-medium font-mono text-xs">{toolCall.toolName}</span>

        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {toolCall.status === 'confirming' ? '확인 필요' : toolCall.status === 'calling' ? '호출 중...' : toolCall.status === 'error' ? '오류' : '완료'}
        </span>

        <span className="flex-1" />

        {expanded ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 px-3 py-2 space-y-2">
          {/* Input */}
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">입력</span>
            <pre className="mt-0.5 text-xs font-mono bg-white dark:bg-neutral-900 rounded px-2 py-1.5 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(toolCall.toolInput, null, 2)}
            </pre>
          </div>

          {/* Confirmation buttons */}
          {toolCall.status === 'confirming' && (
            <div className="flex items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              {/* Split button: Always Allow + dropdown */}
              <div ref={dropdownRef} className="relative inline-flex">
                {/* Primary action: Always Allow */}
                <button
                  type="button"
                  onClick={() => confirmTool(toolCall.toolUseId, true, true)}
                  className="rounded-l-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  항상 허용
                </button>
                {/* Chevron separator + dropdown toggle */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="rounded-r-lg bg-primary px-1.5 py-1.5 text-white hover:bg-primary-600 transition-colors border-l border-white/20"
                >
                  <ChevronDown size={12} />
                </button>
                {/* Dropdown menu */}
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
              {/* Deny button */}
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
  )
}
