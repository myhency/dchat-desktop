import { uIOhook, UiohookKey } from 'uiohook-napi'
import { globalShortcut } from 'electron'

const OPTION_KEYS: Set<number> = new Set([UiohookKey.Alt, UiohookKey.AltRight])
const DOUBLE_TAP_INTERVAL = 400 // ms

let lastOptionUpTime = 0
let optionDownAlone = true
let triggerCallback: (() => void) | null = null

uIOhook.on('keydown', (e) => {
  if (OPTION_KEYS.has(e.keycode)) {
    optionDownAlone = true
  } else {
    optionDownAlone = false
  }
})

uIOhook.on('keyup', (e) => {
  if (!OPTION_KEYS.has(e.keycode)) return
  if (!optionDownAlone) {
    lastOptionUpTime = 0
    return
  }
  const now = Date.now()
  if (lastOptionUpTime > 0 && now - lastOptionUpTime < DOUBLE_TAP_INTERVAL) {
    lastOptionUpTime = 0
    triggerCallback?.()
  } else {
    lastOptionUpTime = now
  }
})

// ── Active state tracking ──

let activeType: 'none' | 'double-option' | 'global' = 'none'
let activeAccelerator: string | null = null

function stopUiohook(): void {
  triggerCallback = null
  uIOhook.stop()
}

function unregisterGlobalShortcut(): void {
  if (activeAccelerator) {
    globalShortcut.unregister(activeAccelerator)
    activeAccelerator = null
  }
}

// ── Public API ──

export function activateShortcut(value: string, callback: () => void): void {
  // Clean up previous listener
  deactivateShortcut()

  if (value === 'double-option') {
    triggerCallback = callback
    uIOhook.start()
    activeType = 'double-option'
  } else if (value === 'option-space') {
    const accel = process.platform === 'win32' ? 'Ctrl+Space' : 'Alt+Space'
    globalShortcut.register(accel, callback)
    activeAccelerator = accel
    activeType = 'global'
  } else if (value.startsWith('custom:') && value.length > 'custom:'.length) {
    const accelerator = value.slice('custom:'.length)
    globalShortcut.register(accelerator, callback)
    activeAccelerator = accelerator
    activeType = 'global'
  }
  // 'none' or bare 'custom' → do nothing
}

export function deactivateShortcut(): void {
  if (activeType === 'double-option') {
    stopUiohook()
  } else if (activeType === 'global') {
    unregisterGlobalShortcut()
  }
  activeType = 'none'
}

// ── Legacy wrappers (kept for compatibility) ──

export function startShortcutListener(callback: () => void): void {
  activateShortcut('double-option', callback)
}

export function stopShortcutListener(): void {
  deactivateShortcut()
}
