import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

function buildErrorReport(error: Error | null, errorInfo: ErrorInfo | null): string {
  const lines = [
    `Timestamp: ${new Date().toISOString()}`,
    `URL: ${window.location.href}`,
    `User-Agent: ${navigator.userAgent}`,
    '',
    `Error: ${error?.message ?? 'Unknown error'}`,
    '',
    `Stack Trace:`,
    error?.stack ?? 'N/A',
  ]
  if (errorInfo?.componentStack) {
    lines.push('', 'Component Stack:', errorInfo.componentStack)
  }
  return lines.join('\n')
}

function ErrorFallback({ error, errorInfo }: { error: Error | null; errorInfo: ErrorInfo | null }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(buildErrorReport(error, errorInfo))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-900 p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <AlertTriangle size={48} className="mx-auto text-amber-500" />

        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          오류가 발생했습니다
        </h1>

        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          예상치 못한 오류가 발생했습니다. 새로고침하거나 오류 정보를 복사하여 보고해 주세요.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-80 transition-opacity"
          >
            <RefreshCw size={16} />
            새로고침
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사됨' : '오류 보고하기'}
          </button>
        </div>

        <div className="text-left">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            오류 상세 정보
          </button>

          {expanded && (
            <pre className="mt-2 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 overflow-auto max-h-64 whitespace-pre-wrap break-words">
              {error?.message && <div className="font-semibold mb-2">{error.message}</div>}
              {error?.stack && <div className="mb-2">{error.stack}</div>}
              {errorInfo?.componentStack && (
                <div className="text-neutral-500 dark:text-neutral-400">{errorInfo.componentStack}</div>
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />
    }
    return this.props.children
  }
}
