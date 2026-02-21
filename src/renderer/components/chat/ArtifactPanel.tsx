import { useState, useCallback } from 'react'
import { Code2, ExternalLink, Copy, Check, X } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useChatStore } from '../../stores/chat.store'
import { useSettingsStore } from '../../stores/settings.store'

export function ArtifactPanel(): React.JSX.Element {
  const artifactPanel = useChatStore((s) => s.artifactPanel)
  const closeArtifact = useChatStore((s) => s.closeArtifact)
  const darkMode = useSettingsStore((s) => s.darkMode)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!artifactPanel) return
    navigator.clipboard.writeText(artifactPanel.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [artifactPanel])

  const handleOpenInBrowser = useCallback(() => {
    if (!artifactPanel) return
    window.hchat.artifact.openInBrowser(artifactPanel.code)
  }, [artifactPanel])

  if (!artifactPanel) return <></>

  return (
    <div className="w-[480px] shrink-0 flex flex-col border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          <Code2 size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate block">
            {artifactPanel.title}
          </span>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
          HTML
        </span>
        <button
          type="button"
          title="브라우저에서 열기"
          onClick={handleOpenInBrowser}
          className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
        >
          <ExternalLink size={14} />
        </button>
        <button
          type="button"
          title="복사"
          onClick={handleCopy}
          className={`p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
            copied ? 'text-green-500' : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button
          type="button"
          title="닫기"
          onClick={closeArtifact}
          className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language="html"
          style={darkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: darkMode ? '#171717' : '#FAF9F7',
            fontSize: '0.8125rem',
            minHeight: '100%'
          }}
          codeTagProps={{ style: {} }}
        >
          {artifactPanel.code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
