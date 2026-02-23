import { isValidElement, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RefreshCw, Pencil, Copy, Check } from 'lucide-react'
import { CodeBlock } from './CodeBlock'
import { HtmlArtifactCard } from './HtmlArtifactCard'
import { formatTime } from '@/shared/lib/time'
import type { ImageAttachment } from '@/entities/session'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  id?: string
  onRegenerate?: (id: string) => void
  onEdit?: (id: string, content: string) => void
  isStreaming?: boolean
  attachments?: ImageAttachment[]
}

export function MessageBubble({
  role,
  content,
  createdAt,
  id,
  onRegenerate,
  onEdit,
  isStreaming,
  attachments
}: MessageBubbleProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const handleEditStart = useCallback(() => {
    setEditContent(content)
    setEditing(true)
  }, [content])

  const handleEditCancel = useCallback(() => {
    setEditing(false)
    setEditContent(content)
  }, [content])

  const handleEditSave = useCallback(() => {
    if (editContent.trim() === '' || !id) return
    setEditing(false)
    onEdit?.(id, editContent.trim())
  }, [editContent, id, onEdit])

  if (role === 'user') {
    if (editing) {
      return (
        <div className="w-full flex justify-end">
          <div className="max-w-[80%] flex flex-col items-end gap-2">
            {attachments && attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <div key={a.id} className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={`data:${a.mimeType};base64,${a.base64Data}`}
                      alt={a.fileName}
                      className="w-40 h-28 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] rounded-2xl px-4 py-3 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEditCancel}
                className="px-3 py-1.5 text-sm rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editContent.trim() === ''}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full flex justify-end">
        <div className="group max-w-[80%] min-w-0 flex flex-col items-end">
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a) => (
                <div key={a.id} className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <img
                    src={`data:${a.mimeType};base64,${a.base64Data}`}
                    alt={a.fileName}
                    className="w-40 h-28 object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {content && (
            <div className="max-w-full rounded-2xl px-4 py-3 bg-primary text-white text-sm leading-relaxed">
              <p className="whitespace-pre-wrap break-words">{content}</p>
            </div>
          )}
          <div
            className={`flex items-center gap-3 mt-1 transition-opacity text-xs text-neutral-400 dark:text-neutral-500 ${
              copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {createdAt && <span>{formatTime(createdAt)}</span>}
            <button
              type="button"
              title="재시도"
              onClick={() => onRegenerate?.(id!)}
              className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              title="편집"
              onClick={handleEditStart}
              className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              title="복사"
              onClick={handleCopy}
              className={`transition-colors ${copied ? 'text-green-500' : 'hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
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
                  const language = match?.[1] ?? ''
                  const codeStr = String(code || '').replace(/\n$/, '')
                  if (language === 'html') {
                    return <HtmlArtifactCard code={codeStr} isStreaming={isStreaming} />
                  }
                  return (
                    <CodeBlock
                      language={language}
                      code={codeStr}
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
        <div
          className="flex items-center gap-3 mt-1 text-xs text-neutral-400 dark:text-neutral-500"
        >
          <button
            type="button"
            title="복사"
            onClick={handleCopy}
            className={`transition-colors ${copied ? 'text-green-500' : 'hover:text-neutral-600 dark:hover:text-neutral-300'}`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {id && onRegenerate && (
            <button
              type="button"
              title="재생성"
              onClick={() => onRegenerate(id)}
              className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
