import { ipcMain, type BrowserWindow } from 'electron'
import type { SendMessageUseCase } from '../../../domain/ports/inbound/send-message.usecase'
import type { GenerateTitleUseCase } from '../../../domain/ports/inbound/generate-title.usecase'
import type { RegenerateMessageUseCase } from '../../../domain/ports/inbound/regenerate-message.usecase'
import type { MessageRepository } from '../../../domain/ports/outbound/message.repository'
import { IPC_CHANNELS } from './channels'

export class ChatIpcHandler {
  private abortController: AbortController | null = null
  private stoppedContent: { sessionId: string; content: string } | null = null
  private lastAssistantMessageId: string | null = null

  constructor(
    private readonly sendMessage: SendMessageUseCase,
    private readonly messageRepo: MessageRepository,
    private readonly generateTitleUseCase: GenerateTitleUseCase,
    private readonly regenerateMessage: RegenerateMessageUseCase
  ) {}

  register(getWindow: () => BrowserWindow | null): void {
    ipcMain.handle(
      IPC_CHANNELS.CHAT.SEND_MESSAGE,
      async (_event, sessionId: string, content: string) => {
        const win = getWindow()
        if (!win) return

        const abortController = new AbortController()
        this.abortController = abortController
        this.stoppedContent = null
        this.lastAssistantMessageId = null

        try {
          let titleTriggered = false
          const message = await this.sendMessage.execute(
            sessionId,
            content,
            (chunk) => {
              win.webContents.send(IPC_CHANNELS.CHAT.STREAM_CHUNK, sessionId, chunk)
              if (!titleTriggered) {
                titleTriggered = true
                this.generateTitleUseCase
                  .generateTitle(sessionId)
                  .then((title) => {
                    if (title) {
                      win.webContents.send(
                        IPC_CHANNELS.SESSION.TITLE_UPDATED,
                        sessionId,
                        title
                      )
                    }
                  })
                  .catch(() => {})
              }
            },
            abortController.signal
          )

          this.lastAssistantMessageId = message.content ? message.id : null

          if (this.stoppedContent?.sessionId === sessionId && message.content) {
            await this.messageRepo.updateContent(message.id, this.stoppedContent.content)
            this.stoppedContent = null
            this.lastAssistantMessageId = null
          }

          win.webContents.send(IPC_CHANNELS.CHAT.STREAM_END, sessionId, message)

          return message
        } catch (error) {
          if (abortController.signal.aborted) {
            win.webContents.send(IPC_CHANNELS.CHAT.STREAM_END, sessionId, { content: '' })
            return
          }
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          win.webContents.send(IPC_CHANNELS.CHAT.STREAM_ERROR, sessionId, errorMessage)
          throw error
        } finally {
          this.abortController = null
        }
      }
    )

    ipcMain.handle(IPC_CHANNELS.CHAT.STOP_STREAM, async (_event, sessionId: string, content: string) => {
      this.abortController?.abort()
      if (!content) return

      this.stoppedContent = { sessionId, content }

      if (this.lastAssistantMessageId) {
        await this.messageRepo.updateContent(this.lastAssistantMessageId, content)
        this.stoppedContent = null
        this.lastAssistantMessageId = null
      }
    })

    ipcMain.handle(
      IPC_CHANNELS.CHAT.GET_MESSAGES,
      async (_event, sessionId: string) => {
        return this.messageRepo.findBySessionId(sessionId)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.CHAT.REGENERATE,
      async (_event, sessionId: string, messageId: string) => {
        const win = getWindow()
        if (!win) return

        const abortController = new AbortController()
        this.abortController = abortController
        this.stoppedContent = null
        this.lastAssistantMessageId = null

        try {
          const message = await this.regenerateMessage.regenerate(
            sessionId,
            messageId,
            (chunk) => {
              win.webContents.send(IPC_CHANNELS.CHAT.STREAM_CHUNK, sessionId, chunk)
            },
            abortController.signal
          )

          this.lastAssistantMessageId = message.content ? message.id : null

          if (this.stoppedContent?.sessionId === sessionId && message.content) {
            await this.messageRepo.updateContent(message.id, this.stoppedContent.content)
            this.stoppedContent = null
            this.lastAssistantMessageId = null
          }

          win.webContents.send(IPC_CHANNELS.CHAT.STREAM_END, sessionId, message)

          return message
        } catch (error) {
          if (abortController.signal.aborted) {
            win.webContents.send(IPC_CHANNELS.CHAT.STREAM_END, sessionId, { content: '' })
            return
          }
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          win.webContents.send(IPC_CHANNELS.CHAT.STREAM_ERROR, sessionId, errorMessage)
          throw error
        } finally {
          this.abortController = null
        }
      }
    )
  }
}
