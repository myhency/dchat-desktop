import { ipcMain } from 'electron'
import type { ManageProjectUseCase } from '../../../domain/ports/inbound/manage-project.usecase'
import { IPC_CHANNELS } from './channels'

export class ProjectIpcHandler {
  constructor(private readonly projectService: ManageProjectUseCase) {}

  register(): void {
    ipcMain.handle(
      IPC_CHANNELS.PROJECT.CREATE,
      async (_event, name: string, description: string) => {
        return this.projectService.create(name, description)
      }
    )

    ipcMain.handle(IPC_CHANNELS.PROJECT.LIST, async () => {
      return this.projectService.list()
    })

    ipcMain.handle(
      IPC_CHANNELS.PROJECT.DELETE,
      async (_event, id: string) => {
        return this.projectService.delete(id)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.PROJECT.UPDATE,
      async (_event, id: string, name: string, description: string) => {
        return this.projectService.update(id, name, description)
      }
    )
  }
}
