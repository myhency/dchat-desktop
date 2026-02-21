export function StreamingIndicator(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-neutral-400">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
      <span>Thinking...</span>
    </div>
  )
}
