import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { SendMessageUseCase } from '../../../domain/ports/inbound/send-message.usecase'
import type { RegenerateMessageUseCase } from '../../../domain/ports/inbound/regenerate-message.usecase'
import type { GenerateTitleUseCase } from '../../../domain/ports/inbound/generate-title.usecase'
import type { ManageMessagesUseCase } from '../../../domain/ports/inbound/manage-messages.usecase'
import type { SendMessageRequest, StopStreamRequest, EditMessageRequest, ToolConfirmRequest } from '@dchat/shared'
import type { ExtendedStreamChunk } from '../../../domain/ports/outbound/llm.gateway'
import type { CompositeMcpClientGateway } from '../../outbound/builtin-tools/composite-mcp-gateway'
import type { ManageSettingsUseCase } from '../../../domain/ports/inbound/manage-settings.usecase'
import logger from '../../../logger'

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Anthropic SDK APIError has .status and .error properties
    const apiError = error as any
    if (apiError.status && apiError.error?.error?.message) {
      return apiError.error.error.message
    }
    // Fallback: strip JSON from message if present
    const msg = error.message
    const jsonIdx = msg.indexOf('{')
    if (jsonIdx > 0) return msg.slice(0, jsonIdx).trim()
    return msg
  }
  return 'Unknown error'
}

// Per-session stream management
const activeStreams = new Map<string, AbortController>()
const stoppedContents = new Map<string, string>()
const lastAssistantMessageIds = new Map<string, string>()

// Pending tool confirmations
const CONFIRM_TIMEOUT_MS = 60_000
const pendingConfirmations = new Map<string, { resolve: (approved: boolean) => void; toolName: string }>()

// Session-scoped "always allow" permissions (cleared on server restart)
export const sessionToolPermissions = new Map<string, Set<string>>()

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function sendChunkSSE(res: Response, chunk: ExtendedStreamChunk): void {
  if (chunk.type === 'tool_use') {
    sendSSE(res, 'tool_use', {
      type: 'tool_use',
      toolUseId: chunk.toolUseId,
      toolName: chunk.toolName,
      toolInput: chunk.toolInput
    })
  } else if (chunk.type === 'tool_result') {
    sendSSE(res, 'tool_result', {
      type: 'tool_result',
      toolUseId: chunk.toolUseId,
      toolName: chunk.toolName,
      content: chunk.content,
      isError: chunk.isError
    })
  } else {
    sendSSE(res, 'chunk', chunk)
  }
}

export function createChatRoutes(
  sendMessage: SendMessageUseCase,
  regenerateMessage: RegenerateMessageUseCase,
  generateTitle: GenerateTitleUseCase,
  manageMessages: ManageMessagesUseCase,
  mcpGateway?: CompositeMcpClientGateway,
  settingsService?: ManageSettingsUseCase
): Router {
  const router = Router()

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)

  // GET /api/chat/:sessionId/messages
  router.get('/:sessionId/messages', asyncHandler(async (req, res) => {
    const messages = await manageMessages.getMessagesBySession(req.params.sessionId)
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

    logger.info({ sessionId }, 'SSE stream started')

    const log = logger.child({ sessionId })

    // Set up tool confirmation handler
    if (mcpGateway) {
      mcpGateway.setConfirmationHandler((toolUseId, toolName, toolInput) => {
        // Session-scoped "always allow" check
        if (sessionToolPermissions.get(sessionId)?.has(toolName)) {
          return Promise.resolve(true)
        }
        return new Promise<boolean>((resolve) => {
          sendSSE(res, 'tool_confirm', { type: 'tool_confirm', toolUseId, toolName, toolInput })
          pendingConfirmations.set(toolUseId, { resolve, toolName })
          // Auto-deny after timeout
          setTimeout(() => {
            if (pendingConfirmations.has(toolUseId)) {
              log.warn({ toolUseId, toolName }, 'Tool confirmation timed out, auto-denying')
              pendingConfirmations.get(toolUseId)!.resolve(false)
              pendingConfirmations.delete(toolUseId)
            }
          }, CONFIRM_TIMEOUT_MS)
        })
      })
    }

    // Clean up on client disconnect
    res.on('close', () => {
      abortController.abort()
      activeStreams.delete(sessionId)
      if (pendingConfirmations.size > 0) {
        log.warn({ pendingCount: pendingConfirmations.size }, 'Client disconnected with pending confirmations')
      }
      // Auto-deny all pending confirmations
      pendingConfirmations.forEach((pending, id) => {
        pending.resolve(false)
        pendingConfirmations.delete(id)
      })
    })

    try {
      let titlePromise: Promise<void> | null = null
      let toolIteration = 0
      const message = await sendMessage.execute(
        sessionId,
        content,
        attachments ?? [],
        (chunk) => {
          if (chunk.type === 'tool_use') {
            toolIteration++
            log.info({ toolName: chunk.toolName, toolUseId: chunk.toolUseId, iteration: toolIteration }, 'Tool use requested by LLM')
            log.debug({ toolName: chunk.toolName, toolInput: chunk.toolInput }, 'Tool use input')
          } else if (chunk.type === 'tool_result') {
            log.info({ toolName: chunk.toolName, toolUseId: chunk.toolUseId, isError: chunk.isError, contentLength: chunk.content.length }, 'Tool result received')
            log.debug({ toolName: chunk.toolName, content: chunk.content.slice(0, 500) }, 'Tool result content')
          }
          sendChunkSSE(res, chunk)

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
        await manageMessages.updateMessageContent(message.id, stopped)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }

      sendSSE(res, 'end', message)
      logger.info({ sessionId }, 'SSE stream ended')
    } catch (error) {
      if (abortController.signal.aborted) {
        logger.info({ sessionId }, 'Stream stopped by client')
        sendSSE(res, 'end', { content: '' })
      } else {
        logger.error({ err: error, sessionId }, 'SSE stream error')
        const errorMessage = formatErrorMessage(error)
        sendSSE(res, 'error', { message: errorMessage })
      }
    } finally {
      mcpGateway?.clearConfirmationHandler()
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

    const log = logger.child({ sessionId })

    logger.info({ sessionId }, 'SSE regenerate stream started')

    // Set up tool confirmation handler
    if (mcpGateway) {
      mcpGateway.setConfirmationHandler((toolUseId, toolName, toolInput) => {
        // Session-scoped "always allow" check
        if (sessionToolPermissions.get(sessionId)?.has(toolName)) {
          return Promise.resolve(true)
        }
        return new Promise<boolean>((resolve) => {
          sendSSE(res, 'tool_confirm', { type: 'tool_confirm', toolUseId, toolName, toolInput })
          pendingConfirmations.set(toolUseId, { resolve, toolName })
          setTimeout(() => {
            if (pendingConfirmations.has(toolUseId)) {
              log.warn({ toolUseId, toolName }, 'Tool confirmation timed out, auto-denying')
              pendingConfirmations.get(toolUseId)!.resolve(false)
              pendingConfirmations.delete(toolUseId)
            }
          }, CONFIRM_TIMEOUT_MS)
        })
      })
    }

    res.on('close', () => {
      abortController.abort()
      activeStreams.delete(sessionId)
      if (pendingConfirmations.size > 0) {
        log.warn({ pendingCount: pendingConfirmations.size }, 'Client disconnected with pending confirmations')
      }
      pendingConfirmations.forEach((pending, id) => {
        pending.resolve(false)
        pendingConfirmations.delete(id)
      })
    })

    try {
      let toolIteration = 0
      const message = await regenerateMessage.regenerate(
        sessionId,
        messageId,
        (chunk) => {
          if (chunk.type === 'tool_use') {
            toolIteration++
            log.info({ toolName: chunk.toolName, toolUseId: chunk.toolUseId, iteration: toolIteration }, 'Tool use requested by LLM')
            log.debug({ toolName: chunk.toolName, toolInput: chunk.toolInput }, 'Tool use input')
          } else if (chunk.type === 'tool_result') {
            log.info({ toolName: chunk.toolName, toolUseId: chunk.toolUseId, isError: chunk.isError, contentLength: chunk.content.length }, 'Tool result received')
            log.debug({ toolName: chunk.toolName, content: chunk.content.slice(0, 500) }, 'Tool result content')
          }
          sendChunkSSE(res, chunk)
        },
        abortController.signal
      )

      lastAssistantMessageIds.set(sessionId, message.content ? message.id : '')

      const stopped = stoppedContents.get(sessionId)
      if (stopped && message.content) {
        await manageMessages.updateMessageContent(message.id, stopped)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }

      sendSSE(res, 'end', message)
      logger.info({ sessionId }, 'SSE regenerate stream ended')
    } catch (error) {
      if (abortController.signal.aborted) {
        logger.info({ sessionId }, 'Regenerate stream stopped by client')
        sendSSE(res, 'end', { content: '' })
      } else {
        logger.error({ err: error, sessionId }, 'SSE regenerate stream error')
        const errorMessage = formatErrorMessage(error)
        sendSSE(res, 'error', { message: errorMessage })
      }
    } finally {
      mcpGateway?.clearConfirmationHandler()
      activeStreams.delete(sessionId)
      res.end()
    }
  })

  // POST /api/chat/:sessionId/messages/:messageId/edit — SSE streaming
  router.post('/:sessionId/messages/:messageId/edit', async (req: Request, res: Response) => {
    const { sessionId, messageId } = req.params
    const { content } = req.body as EditMessageRequest

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const abortController = new AbortController()
    activeStreams.set(sessionId, abortController)
    stoppedContents.delete(sessionId)
    lastAssistantMessageIds.delete(sessionId)

    const log = logger.child({ sessionId })

    logger.info({ sessionId, messageId }, 'SSE edit stream started')

    // Set up tool confirmation handler
    if (mcpGateway) {
      mcpGateway.setConfirmationHandler((toolUseId, toolName, toolInput) => {
        // Session-scoped "always allow" check
        if (sessionToolPermissions.get(sessionId)?.has(toolName)) {
          return Promise.resolve(true)
        }
        return new Promise<boolean>((resolve) => {
          sendSSE(res, 'tool_confirm', { type: 'tool_confirm', toolUseId, toolName, toolInput })
          pendingConfirmations.set(toolUseId, { resolve, toolName })
          setTimeout(() => {
            if (pendingConfirmations.has(toolUseId)) {
              log.warn({ toolUseId, toolName }, 'Tool confirmation timed out, auto-denying')
              pendingConfirmations.get(toolUseId)!.resolve(false)
              pendingConfirmations.delete(toolUseId)
            }
          }, CONFIRM_TIMEOUT_MS)
        })
      })
    }

    res.on('close', () => {
      abortController.abort()
      activeStreams.delete(sessionId)
      if (pendingConfirmations.size > 0) {
        log.warn({ pendingCount: pendingConfirmations.size }, 'Client disconnected with pending confirmations')
      }
      pendingConfirmations.forEach((pending, id) => {
        pending.resolve(false)
        pendingConfirmations.delete(id)
      })
    })

    try {
      await manageMessages.updateMessageContent(messageId, content)

      let toolIteration = 0
      const message = await regenerateMessage.regenerate(
        sessionId,
        messageId,
        (chunk) => {
          if (chunk.type === 'tool_use') {
            toolIteration++
            log.info({ toolName: chunk.toolName, toolUseId: chunk.toolUseId, iteration: toolIteration }, 'Tool use requested by LLM')
            log.debug({ toolName: chunk.toolName, toolInput: chunk.toolInput }, 'Tool use input')
          } else if (chunk.type === 'tool_result') {
            log.info({ toolName: chunk.toolName, toolUseId: chunk.toolUseId, isError: chunk.isError, contentLength: chunk.content.length }, 'Tool result received')
            log.debug({ toolName: chunk.toolName, content: chunk.content.slice(0, 500) }, 'Tool result content')
          }
          sendChunkSSE(res, chunk)
        },
        abortController.signal
      )

      lastAssistantMessageIds.set(sessionId, message.content ? message.id : '')

      const stopped = stoppedContents.get(sessionId)
      if (stopped && message.content) {
        await manageMessages.updateMessageContent(message.id, stopped)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }

      sendSSE(res, 'end', message)
      logger.info({ sessionId }, 'SSE edit stream ended')
    } catch (error) {
      if (abortController.signal.aborted) {
        logger.info({ sessionId }, 'Edit stream stopped by client')
        sendSSE(res, 'end', { content: '' })
      } else {
        logger.error({ err: error, sessionId }, 'SSE edit stream error')
        const errorMessage = formatErrorMessage(error)
        sendSSE(res, 'error', { message: errorMessage })
      }
    } finally {
      mcpGateway?.clearConfirmationHandler()
      activeStreams.delete(sessionId)
      res.end()
    }
  })

  // POST /api/chat/:sessionId/tool-confirm
  router.post('/:sessionId/tool-confirm', asyncHandler(async (req: Request, res: Response) => {
    const { toolUseId, approved, alwaysAllow } = req.body as ToolConfirmRequest
    const pending = pendingConfirmations.get(toolUseId)
    if (pending) {
      logger.info({ sessionId: req.params.sessionId, toolUseId, toolName: pending.toolName, approved }, 'Tool confirmation received')
      if (approved && alwaysAllow) {
        const { sessionId } = req.params
        if (!sessionToolPermissions.has(sessionId)) {
          sessionToolPermissions.set(sessionId, new Set())
        }
        sessionToolPermissions.get(sessionId)!.add(pending.toolName)
      }
      pending.resolve(approved)
      pendingConfirmations.delete(toolUseId)
    } else {
      logger.warn({ sessionId: req.params.sessionId, toolUseId }, 'Tool confirmation for unknown toolUseId')
    }
    res.json({ ok: true })
  }))

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
        await manageMessages.updateMessageContent(lastId, content)
        stoppedContents.delete(sessionId)
        lastAssistantMessageIds.delete(sessionId)
      }
    }

    res.json({ ok: true })
  }))

  return router
}
