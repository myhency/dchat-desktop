import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import type { ToolCallInfo } from '@/entities/session'
import { ToolCallBlock } from './ToolCallBlock'

interface ToolCallGroupProps {
  toolCalls: ToolCallInfo[]
  isStreaming?: boolean
}

export function ToolCallGroup({ toolCalls, isStreaming }: ToolCallGroupProps): React.JSX.Element {
  const allDone = toolCalls.every((tc) => tc.status === 'done' || tc.status === 'error')
  const hasConfirming = toolCalls.some((tc) => tc.status === 'confirming')
  const hasCalling = toolCalls.some((tc) => tc.status === 'calling')

  const [groupExpanded, setGroupExpanded] = useState(!allDone || !!isStreaming)

  // Auto-collapse when all tools finish
  useEffect(() => {
    if (allDone && !isStreaming) {
      setGroupExpanded(false)
    }
  }, [allDone, isStreaming])

  // Auto-expand when any tool needs confirmation
  useEffect(() => {
    if (hasConfirming) {
      setGroupExpanded(true)
    }
  }, [hasConfirming])

  // Header label
  const headerLabel = toolCalls.length === 1
    ? toolCalls[0].toolName
    : `도구 ${toolCalls.length}개 사용`

  // Group border color
  const borderClass = hasConfirming
    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50'

  return (
    <div className={`my-2 rounded-lg border text-sm overflow-hidden ${borderClass}`}>
      {/* Group header */}
      <button
        type="button"
        onClick={() => setGroupExpanded(!groupExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
      >
        {groupExpanded
          ? <ChevronDown size={14} className="text-neutral-400 shrink-0" />
          : <ChevronRight size={14} className="text-neutral-400 shrink-0" />
        }

        {hasCalling && <Loader2 size={14} className="text-blue-500 animate-spin shrink-0" />}

        <span className="font-mono text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {headerLabel}
        </span>

        {!groupExpanded && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {hasConfirming ? '확인 필요' : hasCalling ? '호출 중...' : allDone ? '완료' : ''}
          </span>
        )}
      </button>

      {/* Tool call list */}
      {groupExpanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-700">
          {toolCalls.map((tc, i) => (
            <ToolCallBlock
              key={tc.toolUseId}
              toolCall={tc}
              isLast={i === toolCalls.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
