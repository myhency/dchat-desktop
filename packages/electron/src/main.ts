import { app, BrowserWindow, shell, ipcMain, dialog, systemPreferences } from 'electron'
import { join } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { randomUUID } from 'crypto'
import { initQuickChatDeps, createTray, destroyTray, hideQuickChatPopup, toggleQuickChatPopup, destroyQuickChatPopup } from './tray'
import { activateShortcut, deactivateShortcut } from './shortcut'

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let backendPort: number = 0

const logFilePath = join(app.getPath('logs'), 'dchat-backend.log')

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

  const commonEnv: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: String(port),
    DCHAT_LOG_PATH: logFilePath
  }

  // 프로덕션에서만 Electron userData 경로 사용. dev에서는 백엔드 폴백(~/.dchat/dchat.db) 사용하여
  // npm run dev (웹 모드)와 동일한 DB를 공유.
  if (!isDev) {
    commonEnv.DCHAT_DB_PATH = join(app.getPath('userData'), 'dchat.db')
  }

  if (isDev) {
    backendProcess = spawn('npx', ['tsx', join(app.getAppPath(), '../backend/src/index.ts')], {
      env: commonEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })
  } else {
    backendProcess = spawn(process.execPath, [join(app.getAppPath(), '../backend/dist/backend/src/index.js')], {
      env: { ...commonEnv, NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    })
  }

  backendProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.on('exit', (code, _signal) => {
    backendProcess = null
    if (code !== 0 && code !== null) {
      dialog.showErrorBox(
        'Backend Error',
        `Backend exited unexpectedly (code ${code}).\n\nLogs: ${logFilePath}`
      )
    }
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
  const textExtensions = [
    'txt', 'md', 'rst', 'tex', 'html', 'htm', 'xml', 'svg',
    'tsv', 'jsonl', 'json', 'yaml', 'yml', 'toml',
    'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs',
    'java', 'kt', 'scala', 'swift', 'c', 'cpp', 'h', 'hpp', 'cs', 'php',
    'lua', 'r', 'pl', 'sh', 'bash', 'zsh', 'bat', 'ps1',
    'sql', 'graphql', 'css', 'scss', 'less',
    'ini', 'cfg', 'conf', 'env', 'properties', 'dockerfile', 'tf', 'hcl',
    'gitignore', 'editorconfig',
    'log', 'diff', 'patch',
  ]

  ipcMain.handle('native:pick-image', async () => {
    const win = mainWindow
    if (!win) return []

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'xlsx', 'pptx', 'csv', ...textExtensions] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
        { name: 'Documents', extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'csv'] },
        { name: 'Text & Code', extensions: textExtensions }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) return []

    const attachments: { id: string; fileName: string; mimeType: string; base64Data: string }[] = []
    const textExtSet = new Set(textExtensions)
    for (const filePath of result.filePaths) {
      const buffer = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        csv: 'text/csv',
      }
      attachments.push({
        id: randomUUID(),
        fileName: basename(filePath),
        mimeType: mimeMap[ext] ?? (textExtSet.has(ext) ? 'text/plain' : 'application/octet-stream'),
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

  // Pick a directory from file system
  ipcMain.handle('native:pick-directory', async () => {
    const win = mainWindow
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Open a file with the system default application
  ipcMain.handle('native:open-file', (_event, filePath: string) => shell.openPath(filePath))

  // Open log folder in system file manager
  ipcMain.handle('native:open-log-folder', () => shell.openPath(app.getPath('logs')))

  // Toggle menu bar tray icon
  ipcMain.handle('native:set-show-in-menu-bar', (_event, visible: boolean) => {
    if (visible) {
      createTray()
    } else {
      destroyTray()
    }
  })

  // Toggle quick access shortcut
  ipcMain.handle('native:set-quick-access-shortcut', (_event, shortcut: string) => {
    if (shortcut === 'none' || shortcut === 'custom') {
      deactivateShortcut()
    } else {
      if (shortcut === 'double-option' && process.platform === 'darwin') {
        systemPreferences.isTrustedAccessibilityClient(true)
      }
      activateShortcut(shortcut, toggleQuickChatPopup)
    }
  })

  // Quick Chat: create session from tray popup → open main window
  ipcMain.handle('native:quick-chat-send', async (_event, text: string, model: string) => {
    // 1. Create session via backend API
    const res = await fetch(`http://localhost:${backendPort}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat', model })
    })
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`)
    const session = (await res.json()) as { id: string }

    // 2. Hide popup
    hideQuickChatPopup()

    // 3. Ensure main window exists
    if (!mainWindow) {
      createWindow()
      // Wait for the window to finish loading
      await new Promise<void>((resolve) => {
        mainWindow!.webContents.on('did-finish-load', () => resolve())
      })
    }

    // 4. Show and focus main window
    mainWindow!.show()
    mainWindow!.focus()

    // 5. Tell renderer to navigate to the new session and send the message
    mainWindow!.webContents.send('native:navigate-to-session', session.id, text)

    return session.id
  })
}

// ── App Lifecycle ──

app.whenReady().then(async () => {
  try {
    backendPort = await startBackend()
    console.log(`Backend started on port ${backendPort}`)
  } catch (err) {
    dialog.showErrorBox(
      'Backend Startup Failed',
      `Could not start backend server.\n\nLogs: ${logFilePath}\n\n${err}`
    )
    app.quit()
    return
  }

  registerNativeIpc()
  createWindow()

  // Initialize quick chat deps (shared by tray and shortcut)
  initQuickChatDeps(backendPort, () => mainWindow, createWindow)

  // Initialize tray and shortcut based on saved settings
  try {
    const settingsRes = await fetch(`http://localhost:${backendPort}/api/settings`)
    if (settingsRes.ok) {
      const settings = (await settingsRes.json()) as Record<string, string>
      if (settings['show_in_menu_bar'] !== 'false') {
        createTray()
      }
      const savedShortcut = settings['quick_access_shortcut'] ?? 'double-option'
      if (savedShortcut !== 'none' && savedShortcut !== 'custom') {
        if (savedShortcut === 'double-option' && process.platform === 'darwin') {
          systemPreferences.isTrustedAccessibilityClient(true)
        }
        activateShortcut(savedShortcut, toggleQuickChatPopup)
      }
    }
  } catch {
    // Settings fetch failed — default to showing tray and enabling shortcut
    createTray()
    activateShortcut('double-option', toggleQuickChatPopup)
  }

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
  deactivateShortcut()
  destroyQuickChatPopup()
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})
