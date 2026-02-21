import { create } from 'zustand'

interface SettingsState {
  anthropicApiKey: string
  openaiApiKey: string
  selectedModel: string
  darkMode: boolean
  settingsOpen: boolean
  sidebarOpen: boolean

  loadSettings: () => Promise<void>
  setApiKey: (provider: 'anthropic' | 'openai', key: string) => Promise<void>
  setSelectedModel: (model: string) => void
  toggleDarkMode: () => void
  toggleSettings: () => void
  toggleSidebar: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  anthropicApiKey: '',
  openaiApiKey: '',
  selectedModel: 'claude-opus-4-6',
  darkMode: true,
  settingsOpen: false,
  sidebarOpen: true,

  loadSettings: async () => {
    const all = await window.hchat.settings.getAll()
    set({
      anthropicApiKey: all['anthropic_api_key'] ?? '',
      openaiApiKey: all['openai_api_key'] ?? '',
      selectedModel: all['selected_model'] ?? 'claude-opus-4-6',
      darkMode: all['dark_mode'] !== 'false',
      sidebarOpen: all['sidebar_open'] !== 'false'
    })

    // 다크모드 적용
    const isDark = all['dark_mode'] !== 'false'
    document.documentElement.classList.toggle('dark', isDark)
  },

  setApiKey: async (provider, key) => {
    const settingsKey =
      provider === 'anthropic' ? 'anthropic_api_key' : 'openai_api_key'
    await window.hchat.settings.set(settingsKey, key)
    if (provider === 'anthropic') {
      set({ anthropicApiKey: key })
    } else {
      set({ openaiApiKey: key })
    }
  },

  setSelectedModel: (model) => {
    set({ selectedModel: model })
    window.hchat.settings.set('selected_model', model)
  },

  toggleDarkMode: () => {
    set((state) => {
      const newDark = !state.darkMode
      document.documentElement.classList.toggle('dark', newDark)
      window.hchat.settings.set('dark_mode', String(newDark))
      return { darkMode: newDark }
    })
  },

  toggleSettings: () => {
    set((state) => ({ settingsOpen: !state.settingsOpen }))
  },

  toggleSidebar: () => {
    set((state) => {
      const newOpen = !state.sidebarOpen
      window.hchat.settings.set('sidebar_open', String(newOpen))
      return { sidebarOpen: newOpen }
    })
  }
}))
