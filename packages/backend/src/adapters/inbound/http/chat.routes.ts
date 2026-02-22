import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { SendMessageUseCase } from '../../../domain/ports/inbound/send-message.usecase'
import type { RegenerateMessageUseCase } from '../../../domain/ports/inbound/regenerate-message.usecase'
import type { GenerateTitleUseCase } from '../../../domain/ports/inbound/generate-title.usecase'
import type { MessageRepository } from '../../../domain/ports/outbound/message.repository'
import type { SendMessageRequest, StopStreamRequest } from '@dchat/shared'

// Per-session stream management
const activeStreams = new Map<string, AbortController>()
const stoppedContents = new Map<string, string>()
const lastAssistantMessageIds = new Map<string, string>()

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function createChatRoutes(
  sendMessage: SendMessageUseCase,
  regenerateMessage: RegenerateMessageUseCase,
  generateTitle: GenerateTitleUseCase,
  messageRepo: MessageRepository
): Router {
  const router = Router()

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)

  // GET /api/chat/:sessionId/messages
  router.get('/:sessionId/messages', asyncHandler(async (req, res) => {
    const messages = await messageRepo.findBySessionId(req.params.sessionId)
    res.json(messages)
  }))

  // POST /api/chat/:sessionId/messages — SSE streaming
  router.post('/:sessionId/messages', async (req: Request, res: Response) => {
    const { sessionId } = req.params
    const { content, attachments } = req.body as SendMessageRequest

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const abortController = new AbortController()
    activeStreams.set(sessionId, abortController)
    stoppedContents.delete(sessionId)
    lastAssistantMessageIds.delete(sessionId)

    // Clean up on client disconnect
    res.on('close', () => {
      abortController.abort()
      activeStreams.delete(sessionId)
    })

    try {
      let titlePromise: Promise<void> | null = null
      const message = await sendMessage.execute(
        sessionId,
        content,
        attachments ?? [],
        (chunk) => {
          sendSSE(res, 'chunk', chunk)

          if (!titlePromise) {
            titlePromise = generateTitle
              .generateTitle(sessionId)
              .then((title) => {
                if (title) {
                  sendSSE(res, 'title', { sessionId, title })
                }
              })
              .catch(() => {})
          }
        },
        abortController.signal
      )

      if (titlePromise) await titlePromise

      lastAssistantMessageIds.set(sessionId, message.content ? message.id : '')

      // Handle stopped content if stop was called during streaming
      const stopped = stoppedContents.get(sessionId)
      if (stopped && message.content) {
        await messageRepo.updateContent(message.id, stopped)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }

      sendSSE(res, 'end', message)
    } catch (error) {
      if (abortController.signal.aborted) {
        sendSSE(res, 'end', { content: '' })
      } else {
        console.error('[chat]', error instanceof Error ? error.message : error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        sendSSE(res, 'error', { message: errorMessage })
      }
    } finally {
      activeStreams.delete(sessionId)
      res.end()
    }
  })

  // POST /api/chat/:sessionId/messages/:messageId/regenerate — SSE streaming
  router.post('/:sessionId/messages/:messageId/regenerate', async (req: Request, res: Response) => {
    const { sessionId, messageId } = req.params

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const abortController = new AbortController()
    activeStreams.set(sessionId, abortController)
    stoppedContents.delete(sessionId)
    lastAssistantMessageIds.delete(sessionId)

    res.on('close', () => {
      abortController.abort()
      activeStreams.delete(sessionId)
    })

    try {
      const message = await regenerateMessage.regenerate(
        sessionId,
        messageId,
        (chunk) => {
          sendSSE(res, 'chunk', chunk)
        },
        abortController.signal
      )

      lastAssistantMessageIds.set(sessionId, message.content ? message.id : '')

      const stopped = stoppedContents.get(sessionId)
      if (stopped && message.content) {
        await messageRepo.updateContent(message.id, stopped)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }

      sendSSE(res, 'end', message)
    } catch (error) {
      if (abortController.signal.aborted) {
        sendSSE(res, 'end', { content: '' })
      } else {
        console.error('[chat]', error instanceof Error ? error.message : error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        sendSSE(res, 'error', { message: errorMessage })
      }
    } finally {
      activeStreams.delete(sessionId)
      res.end()
    }
  })

  // POST /api/chat/:sessionId/stop
  router.post('/:sessionId/stop', asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const { content } = req.body as StopStreamRequest

    const controller = activeStreams.get(sessionId)
    controller?.abort()

    if (content) {
      stoppedContents.set(sessionId, content)

      const lastId = lastAssistantMessageIds.get(sessionId)
      if (lastId) {
        await messageRepo.updateContent(lastId, content)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }
    }

    res.json({ ok: true })
  }))

  return router
}
