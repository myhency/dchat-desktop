import { Tray, BrowserWindow, nativeImage, screen } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { deflateSync } from 'zlib'

let tray: Tray | null = null
let quickChatPopup: BrowserWindow | null = null

// ── PNG Builder (generates a valid 22×22 chat-bubble template image) ──

function makeCrc32Table(): Uint32Array {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
}

const crcTable = makeCrc32Table()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crcBuf])
}

function chatBubbleAlpha(x: number, y: number): number {
  // Bubble body: rounded rect (2,2)–(19,14), corner radius 3
  // Bottom-left corner is NOT rounded so the tail connects seamlessly
  const L = 2, R = 19, T = 2, B = 14, cr = 3
  let inBubble = false
  if (x >= L && x <= R && y >= T && y <= B) {
    inBubble = true
    if (x < L + cr && y < T + cr) {
      if ((x - L - cr) ** 2 + (y - T - cr) ** 2 > cr * cr) inBubble = false
    } else if (x > R - cr && y < T + cr) {
      if ((x - R + cr) ** 2 + (y - T - cr) ** 2 > cr * cr) inBubble = false
    } else if (x > R - cr && y > B - cr) {
      if ((x - R + cr) ** 2 + (y - B + cr) ** 2 > cr * cr) inBubble = false
    }
  }

  // Tail: triangle below bubble body, vertices (3,B)→(3,B+4)→(8,B)
  let inTail = false
  if (x >= 3 && y > B && y <= B + 4) {
    if (x <= 3 + 5 * (1 - (y - B) / 4)) inTail = true
  }

  return (inBubble || inTail) ? 255 : 0
}

function createTrayIcon(): Electron.NativeImage {
  const W = 22, H = 22
  // RGBA pixel rows, each prefixed with PNG filter byte 0 (None)
  const raw = Buffer.alloc(H * (1 + W * 4), 0)
  for (let y = 0; y < H; y++) {
    const row = y * (1 + W * 4)
    for (let x = 0; x < W; x++) {
      raw[row + 1 + x * 4 + 3] = chatBubbleAlpha(x, y)
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA

  const png = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])

  const img = nativeImage.createFromBuffer(png)
  if (img.isEmpty()) {
    console.warn('[tray] Generated PNG is empty — icon will not display')
  }
  if (process.platform === 'darwin') {
    img.setTemplateImage(true)
  }
  return img
}

interface TrayDeps {
  backendPort: number
  getMainWindow: () => BrowserWindow | null
  createWindowFn: () => void
}

let deps: TrayDeps | null = null

function getPopupUrl(port: number): string {
  const isDev = process.env['ELECTRON_RENDERER_URL']
  if (isDev) {
    return `${isDev}?mode=quick-chat`
  }
  // In production, load from the built frontend
  return `${pathToFileURL(join(__dirname, '../../frontend/dist/index.html')).href}?mode=quick-chat`
}

function createQuickChatPopup(port: number): BrowserWindow {
  const popup = new BrowserWindow({
    width: 480,
    height: 160,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    transparent: true,
    ...(process.platform === 'darwin' ? { vibrancy: 'popover' as const, visualEffectState: 'active' as const } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  popup.loadURL(getPopupUrl(port))

  popup.on('blur', () => {
    popup.hide()
  })

  return popup
}

function positionPopupCenter(popup: BrowserWindow): void {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const { x, y, width, height } = display.workArea
  const bounds = popup.getBounds()
  const px = Math.round(x + (width - bounds.width) / 2)
  const py = Math.round(y + height * 3 / 4 - bounds.height / 2)
  popup.setPosition(px, py)
}

export function toggleQuickChatPopup(): void {
  if (!deps) return

  if (!quickChatPopup) {
    quickChatPopup = createQuickChatPopup(deps.backendPort)
  }

  if (quickChatPopup.isVisible()) {
    quickChatPopup.hide()
  } else {
    positionPopupCenter(quickChatPopup)
    quickChatPopup.show()
    quickChatPopup.focus()
  }
}

export function initQuickChatDeps(
  backendPort: number,
  getMainWindow: () => BrowserWindow | null,
  createWindowFn: () => void
): void {
  deps = { backendPort, getMainWindow, createWindowFn }
}

export function createTray(): void {
  if (tray || !deps) return
  try {
    tray = new Tray(createTrayIcon())
    tray.setToolTip('D Chat')
    tray.on('click', () => {
      toggleQuickChatPopup()
    })
  } catch (err) {
    console.error('[electron] Failed to create tray:', err)
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function destroyQuickChatPopup(): void {
  if (quickChatPopup) {
    quickChatPopup.destroy()
    quickChatPopup = null
  }
}

export function hideQuickChatPopup(): void {
  if (quickChatPopup && quickChatPopup.isVisible()) {
    quickChatPopup.hide()
  }
}
