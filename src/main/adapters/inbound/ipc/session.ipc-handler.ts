import { ipcMain } from 'electron'
import type { ManageSessionUseCase } from '../../../domain/ports/inbound/manage-session.usecase'
import { IPC_CHANNELS } from './channels'

export class SessionIpcHandler {
  constructor(private readonly sessionService: ManageSessionUseCase) {}

  register(): void {
    ipcMain.handle(
      IPC_CHANNELS.SESSION.CREATE,
      async (_event, title: string, model: string) => {
        return this.sessionService.create(title, model)
      }
    )

    ipcMain.handle(IPC_CHANNELS.SESSION.LIST, async () => {
      return this.sessionService.list()
    })

    ipcMain.handle(
      IPC_CHANNELS.SESSION.GET,
      async (_event, id: string) => {
        return this.sessionService.getById(id)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.SESSION.DELETE,
      async (_event, id: string) => {
        return this.sessionService.delete(id)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.SESSION.UPDATE_MODEL,
      async (_event, id: string, model: string) => {
        return this.sessionService.updateModel(id, model)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.SESSION.UPDATE_TITLE,
      async (_event, id: string, title: string) => {
        return this.sessionService.updateTitle(id, title)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.SESSION.TOGGLE_FAVORITE,
      async (_event, id: string) => {
        return this.sessionService.toggleFavorite(id)
      }
    )
  }
}
