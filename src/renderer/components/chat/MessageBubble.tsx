import { isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export function MessageBubble({
  role,
  content
}: MessageBubbleProps): React.JSX.Element {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`text-sm leading-relaxed ${
          isUser
            ? 'max-w-[80%] rounded-2xl px-4 py-3 bg-blue-600 text-white'
            : 'max-w-none py-1 text-neutral-900 dark:text-neutral-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
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
        )}
      </div>
    </div>
  )
}
