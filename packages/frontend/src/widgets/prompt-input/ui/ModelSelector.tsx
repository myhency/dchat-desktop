import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, ArrowLeft, Check } from 'lucide-react'
import { useSessionStore } from '@/entities/session'
import { modelsApi } from '@/shared/api'
import { getShortName, getDescription } from '@/shared/lib/model-meta'

interface ModelInfo {
  id: string
  name: string
  provider: string
}

export function ModelSelector(): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const sessions = useSessionStore((s) => s.sessions)
  const isStreaming = useSessionStore((s) => s.streamingSessionIds.has(s.currentSessionId ?? ''))
  const updateSessionModel = useSessionStore((s) => s.updateSessionModel)

  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const currentModel = currentSession?.model ?? ''

  const handleOpen = useCallback(async () => {
    if (isStreaming) return
    setOpen(true)
    setShowAll(false)
    try {
      const list = await modelsApi.list()
      setModels(list as ModelInfo[])
    } catch {
      setModels([])
    }
  }, [isStreaming])

  const handleSelect = useCallback(
    async (modelId: string) => {
      if (!currentSessionId || modelId === currentModel) {
        setOpen(false)
        return
      }
      await updateSessionModel(currentSessionId, modelId)
      setOpen(false)
    },
    [currentSessionId, currentModel, updateSessionModel]
  )

  // click-outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!currentSessionId) return null

  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const key = m.provider
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        disabled={isStreaming}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {getShortName(currentModel)}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 z-50 min-w-[220px] rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg py-1">
          {!showAll ? (
            <>
              {/* Current model */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {getShortName(currentModel)}
                  </span>
                  <Check size={14} className="text-blue-500" />
                </div>
                {getDescription(currentModel) && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {getDescription(currentModel)}
                  </p>
                )}
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
              <button
                onClick={() => setShowAll(true)}
                className="w-full px-3 py-2 text-left text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-between"
              >
                More models
                <ChevronRight size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAll(false)}
                className="w-full px-3 py-1.5 text-left text-xs text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                Back
              </button>
              <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
              {Object.entries(grouped).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    {provider}
                  </div>
                  {providerModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m.id)}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-between"
                    >
                      <span>{m.name}</span>
                      {m.id === currentModel && (
                        <Check size={14} className="text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
