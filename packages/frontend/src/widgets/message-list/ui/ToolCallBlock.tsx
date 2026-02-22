import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Check, X } from 'lucide-react'
import type { ToolCallInfo } from '@/entities/session'

interface ToolCallBlockProps {
  toolCall: ToolCallInfo
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
      >
        {/* Status icon */}
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
          {toolCall.status === 'calling' ? '호출 중...' : toolCall.status === 'error' ? '오류' : '완료'}
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
