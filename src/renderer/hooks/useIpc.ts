import { useEffect } from 'react'
import { useChatStore } from '../stores/chat.store'

export function useIpcListeners(): void {
  const appendStreamChunk = useChatStore((s) => s.appendStreamChunk)
  const finishStream = useChatStore((s) => s.finishStream)
  const setStreamError = useChatStore((s) => s.setStreamError)
  const setSessionTitleLocal = useChatStore((s) => s.setSessionTitleLocal)

  useEffect(() => {
    const removeChunk = window.hchat.chat.onStreamChunk((sessionId: string, chunk: unknown) => {
      const c = chunk as { type: string; content: string }
      if (c.type === 'text') {
        appendStreamChunk(sessionId, c.content)
      }
    })

    const removeEnd = window.hchat.chat.onStreamEnd((sessionId: string, message: unknown) => {
      finishStream(sessionId, message as Parameters<typeof finishStream>[1])
    })

    const removeError = window.hchat.chat.onStreamError((sessionId: string, error: string) => {
      setStreamError(sessionId, error)
    })

    const removeTitleUpdated = window.hchat.session.onTitleUpdated(
      (sessionId: string, title: string) => {
        setSessionTitleLocal(sessionId, title)
      }
    )

    return () => {
      removeChunk()
      removeEnd()
      removeError()
      removeTitleUpdated()
    }
  }, [appendStreamChunk, finishStream, setStreamError, setSessionTitleLocal])
}
