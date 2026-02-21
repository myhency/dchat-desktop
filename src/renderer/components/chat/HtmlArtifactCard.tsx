import { useCallback, useEffect, useRef } from 'react'
import { Code2, ExternalLink } from 'lucide-react'
import { useChatStore } from '../../stores/chat.store'

interface HtmlArtifactCardProps {
  code: string
  isStreaming?: boolean
}

export function HtmlArtifactCard({ code, isStreaming }: HtmlArtifactCardProps): React.JSX.Element {
  const openArtifact = useChatStore((s) => s.openArtifact)
  const title = /<title>(.*?)<\/title>/i.exec(code)?.[1] || 'HTML'
  const codeRef = useRef<HTMLPreElement>(null)

  const handleClick = useCallback(() => {
    openArtifact(code, title)
  }, [code, title, openArtifact])

  const handleOpenInBrowser = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.hchat.artifact.openInBrowser(code)
    },
    [code]
  )

  useEffect(() => {
    if (isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [isStreaming, code])

  if (isStreaming) {
    return (
      <div className="my-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shrink-0">
            <Code2 size={14} />
          </div>
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate flex-1">
            {title === 'HTML' ? 'HTML 코드 생성 중...' : title}
          </span>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
        </div>
        <pre
          ref={codeRef}
          className="max-h-[200px] overflow-y-auto px-4 py-3 text-xs font-mono text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-all leading-relaxed"
        >
          {code}
        </pre>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className="my-3 flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-colors"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shrink-0">
        <Code2 size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {title}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          HTML
        </div>
      </div>
      <button
        type="button"
        title="브라우저에서 열기"
        onClick={handleOpenInBrowser}
        className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-500 dark:text-neutral-400 transition-colors"
      >
        <ExternalLink size={14} />
      </button>
    </div>
  )
}
