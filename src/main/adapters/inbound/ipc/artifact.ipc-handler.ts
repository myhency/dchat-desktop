import { ipcMain, shell } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { IPC_CHANNELS } from './channels'

export class ArtifactIpcHandler {
  register(): void {
    ipcMain.handle(
      IPC_CHANNELS.ARTIFACT.OPEN_IN_BROWSER,
      async (_event, htmlContent: string) => {
        const filePath = join(tmpdir(), `dchat-artifact-${randomUUID()}.html`)
        await writeFile(filePath, htmlContent, 'utf-8')
        await shell.openExternal(`file://${filePath}`)
      }
    )
  }
}
