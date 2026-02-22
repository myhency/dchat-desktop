import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { randomUUID } from 'crypto'

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let backendPort: number = 0

/**
 * Find an available port
 */
function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error('Could not find port')))
      }
    })
    server.on('error', reject)
  })
}

/**
 * Wait for backend to be ready by polling /api/health
 */
async function waitForBackend(port: number, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('Backend did not start in time')
}

/**
 * Spawn the backend process
 */
async function startBackend(): Promise<number> {
  const isDev = !app.isPackaged
  const port = isDev ? 3131 : await findAvailablePort()

  const dbPath = join(app.getPath('userData'), 'hchat.db')

  if (isDev) {
    backendProcess = spawn('npx', ['tsx', join(app.getAppPath(), '../backend/src/index.ts')], {
      env: {
        ...process.env,
        PORT: String(port),
        DCHAT_DB_PATH: dbPath
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })
  } else {
    backendProcess = spawn('node', [join(app.getAppPath(), '../backend/dist/index.js')], {
      env: {
        ...process.env,
        PORT: String(port),
        DCHAT_DB_PATH: dbPath
      },
      stdio: ['pipe', 'pipe', 'pipe']
    })
  }

  backendProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`)
    backendProcess = null
  })

  await waitForBackend(port)
  return port
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.meta && input.alt && input.key === 'i') {
        mainWindow?.webContents.toggleDevTools()
      }
    })
  }

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(app.getAppPath(), '../frontend/dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── Native IPC Handlers ──

function registerNativeIpc(): void {
  // Pick images from file system
  ipcMain.handle('native:pick-image', async () => {
    const win = mainWindow
    if (!win) return []

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })

    if (result.canceled || result.filePaths.length === 0) return []

    const attachments: { id: string; fileName: string; mimeType: string; base64Data: string }[] = []
    for (const filePath of result.filePaths) {
      const buffer = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp'
      }
      attachments.push({
        id: randomUUID(),
        fileName: basename(filePath),
        mimeType: mimeMap[ext] ?? 'image/png',
        base64Data: buffer.toString('base64')
      })
    }

    return attachments
  })

  // Open HTML in system browser
  ipcMain.handle('native:open-in-browser', async (_event, htmlContent: string) => {
    const { writeFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const filePath = join(tmpdir(), `dchat-artifact-${randomUUID()}.html`)
    await writeFile(filePath, htmlContent, 'utf-8')
    await shell.openExternal(`file://${filePath}`)
  })

  // Get backend API URL (async)
  ipcMain.handle('native:get-api-url', () => {
    return `http://localhost:${backendPort}`
  })

  // Get backend API URL (sync — used by preload at module scope)
  ipcMain.on('native:get-api-url-sync', (event) => {
    event.returnValue = `http://localhost:${backendPort}`
  })
}

// ── App Lifecycle ──

app.whenReady().then(async () => {
  try {
    backendPort = await startBackend()
    console.log(`Backend started on port ${backendPort}`)
  } catch (err) {
    console.error('Failed to start backend:', err)
    app.quit()
    return
  }

  registerNativeIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})
