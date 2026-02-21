import { isValidElement, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { formatTime } from '../../lib/time'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

export function MessageBubble({
  role,
  content,
  createdAt
}: MessageBubbleProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="group max-w-[80%] flex flex-col items-end">
          <div className="rounded-2xl px-4 py-3 bg-blue-600 text-white text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
          <div
            className={`flex items-center gap-3 mt-1 transition-opacity text-xs text-neutral-400 dark:text-neutral-500 ${
              copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {createdAt && <span>{formatTime(createdAt)}</span>}
            <button
              type="button"
              title="재시도"
              className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 15A9 9 0 1 0 5.64 5.64L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              title="편집"
              className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              title="복사"
              onClick={handleCopy}
              className={`transition-colors ${copied ? 'text-green-500' : 'hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-none py-1 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-code:text-pink-500 dark:prose-code:text-pink-400 prose-code:before:content-[''] prose-code:after:content-['']">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre({ children }) {
                if (isValidElement(children)) {
                  const { className, children: code } = children.props as {
                    className?: string
                    children?: string
                  }
                  const match = /language-(\w+)/.exec(className || '')
                  return (
                    <CodeBlock
                      language={match?.[1] ?? ''}
                      code={String(code || '').replace(/\n$/, '')}
                    />
                  )
                }
                return <pre>{children}</pre>
              },
              code({ className, children }) {
                return <code className={className}>{children}</code>
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
