import { create } from 'zustand'
import { settingsApi } from '../api'

/* ── helpers (module scope) ── */

function resolveDarkMode(mode: 'light' | 'auto' | 'dark'): boolean {
  if (mode === 'light') return false
  if (mode === 'dark') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDarkMode(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark)
}

let mediaCleanup: (() => void) | null = null

function setupMediaListener(set: (partial: Partial<SettingsState>) => void): void {
  if (mediaCleanup) {
    mediaCleanup()
    mediaCleanup = null
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent): void => {
    const isDark = e.matches
    applyDarkMode(isDark)
    set({ darkMode: isDark })
  }
  mq.addEventListener('change', handler)
  mediaCleanup = () => mq.removeEventListener('change', handler)
}

function debouncedPersist(key: string, delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (value: string) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      settingsApi.set(key, value)
      timer = null
    }, delay)
  }
}

const persistFullName = debouncedPersist('full_name')
const persistNickname = debouncedPersist('nickname')
const persistCustomInstructions = debouncedPersist('custom_instructions')

/* ── store ── */

interface SettingsState {
  anthropicApiKey: string
  openaiApiKey: string
  anthropicBaseUrl: string
  openaiBaseUrl: string
  selectedModel: string
  colorMode: 'light' | 'auto' | 'dark'
  darkMode: boolean
  settingsOpen: boolean
  sidebarOpen: boolean
  fullName: string
  nickname: string
  role: string
  customInstructions: string
  responseNotif: boolean
  codeEmailNotif: boolean
  anthropicVerified: boolean
  openaiVerified: boolean

  loadSettings: () => Promise<void>
  setApiKey: (provider: 'anthropic' | 'openai', key: string) => Promise<void>
  setSelectedModel: (model: string) => void
  setAnthropicBaseUrl: (url: string) => void
  setOpenaiBaseUrl: (url: string) => void
  setColorMode: (mode: 'light' | 'auto' | 'dark') => void
  setFullName: (v: string) => void
  setNickname: (v: string) => void
  setRole: (v: string) => void
  setCustomInstructions: (v: string) => void
  setResponseNotif: (v: boolean) => void
  setCodeEmailNotif: (v: boolean) => void
  setProviderVerified: (provider: 'anthropic' | 'openai', verified: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  toggleSidebar: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  anthropicApiKey: '',
  openaiApiKey: '',
  anthropicBaseUrl: '',
  openaiBaseUrl: '',
  selectedModel: 'claude-opus-4-6',
  colorMode: 'auto',
  darkMode: true,
  settingsOpen: false,
  sidebarOpen: true,
  fullName: '',
  nickname: '',
  role: '',
  customInstructions: '',
  responseNotif: true,
  codeEmailNotif: true,
  anthropicVerified: false,
  openaiVerified: false,

  loadSettings: async () => {
    const all = await settingsApi.getAll()

    // color_mode 마이그레이션: dark_mode → color_mode
    let colorMode: 'light' | 'auto' | 'dark' = 'auto'
    if (all['color_mode']) {
      colorMode = all['color_mode'] as 'light' | 'auto' | 'dark'
    } else if (all['dark_mode']) {
      colorMode = all['dark_mode'] === 'true' ? 'dark' : 'light'
      settingsApi.set('color_mode', colorMode)
    }

    const isDark = resolveDarkMode(colorMode)
    applyDarkMode(isDark)

    if (colorMode === 'auto') {
      setupMediaListener(set)
    }

    set({
      anthropicApiKey: all['anthropic_api_key'] ?? '',
      openaiApiKey: all['openai_api_key'] ?? '',
      anthropicBaseUrl: all['anthropic_base_url'] ?? '',
      openaiBaseUrl: all['openai_base_url'] ?? '',
      selectedModel: all['selected_model'] ?? 'claude-opus-4-6',
      colorMode,
      darkMode: isDark,
      sidebarOpen: all['sidebar_open'] !== 'false',
      fullName: all['full_name'] ?? '',
      nickname: all['nickname'] ?? '',
      role: all['role'] ?? '',
      customInstructions: all['custom_instructions'] ?? '',
      responseNotif: all['response_notif'] !== 'false',
      codeEmailNotif: all['code_email_notif'] !== 'false',
      anthropicVerified: all['anthropic_verified'] === 'true',
      openaiVerified: all['openai_verified'] === 'true'
    })
  },

  setApiKey: async (provider, key) => {
    const settingsKey =
      provider === 'anthropic' ? 'anthropic_api_key' : 'openai_api_key'
    await settingsApi.set(settingsKey, key)
    if (provider === 'anthropic') {
      set({ anthropicApiKey: key, anthropicVerified: false })
      settingsApi.set('anthropic_verified', 'false')
    } else {
      set({ openaiApiKey: key, openaiVerified: false })
      settingsApi.set('openai_verified', 'false')
    }
  },

  setSelectedModel: (model) => {
    set({ selectedModel: model })
    settingsApi.set('selected_model', model)
  },

  setAnthropicBaseUrl: (url) => {
    set({ anthropicBaseUrl: url, anthropicVerified: false })
    settingsApi.set('anthropic_base_url', url)
    settingsApi.set('anthropic_verified', 'false')
  },

  setOpenaiBaseUrl: (url) => {
    set({ openaiBaseUrl: url, openaiVerified: false })
    settingsApi.set('openai_base_url', url)
    settingsApi.set('openai_verified', 'false')
  },

  setColorMode: (mode) => {
    const isDark = resolveDarkMode(mode)
    applyDarkMode(isDark)
    settingsApi.set('color_mode', mode)

    if (mode === 'auto') {
      setupMediaListener(set)
    } else if (mediaCleanup) {
      mediaCleanup()
      mediaCleanup = null
    }

    set({ colorMode: mode, darkMode: isDark })
  },

  setFullName: (v) => {
    set({ fullName: v })
    persistFullName(v)
  },

  setNickname: (v) => {
    set({ nickname: v })
    persistNickname(v)
  },

  setRole: (v) => {
    set({ role: v })
    settingsApi.set('role', v)
  },

  setCustomInstructions: (v) => {
    set({ customInstructions: v })
    persistCustomInstructions(v)
  },

  setResponseNotif: (v) => {
    set({ responseNotif: v })
    settingsApi.set('response_notif', String(v))
  },

  setCodeEmailNotif: (v) => {
    set({ codeEmailNotif: v })
    settingsApi.set('code_email_notif', String(v))
  },

  setProviderVerified: (provider, verified) => {
    const key = provider === 'anthropic' ? 'anthropic_verified' : 'openai_verified'
    settingsApi.set(key, String(verified))
    if (provider === 'anthropic') set({ anthropicVerified: verified })
    else set({ openaiVerified: verified })
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => {
    set((state) => ({ settingsOpen: !state.settingsOpen }))
  },

  toggleSidebar: () => {
    set((state) => {
      const newOpen = !state.sidebarOpen
      settingsApi.set('sidebar_open', String(newOpen))
      return { sidebarOpen: newOpen }
    })
  }
}))
