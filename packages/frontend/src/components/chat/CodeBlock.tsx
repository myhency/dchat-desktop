import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useSettingsStore } from '../../stores/settings.store'

interface CodeBlockProps {
  language: string
  code: string
}

export function CodeBlock({ language, code }: CodeBlockProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const darkMode = useSettingsStore((s) => s.darkMode)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="group my-3 w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 rounded-t-lg border border-b-0 border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400" style={{ background: darkMode ? '#171717' : '#FAF9F7' }}>
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center hover:text-neutral-900 dark:hover:text-neutral-200 transition-opacity ${copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {/* Code body */}
      <div className="rounded-b-lg border border-t-0 border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        <SyntaxHighlighter
          language={language || undefined}
          style={darkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.5rem 0.5rem',
            background: darkMode ? '#171717' : '#FAF9F7',
            fontSize: '0.8125rem'
          }}
          codeTagProps={{ style: {} }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
