import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings.store'

const MODELS = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' }
]

export function SettingsPanel(): React.JSX.Element | null {
  const settingsOpen = useSettingsStore((s) => s.settingsOpen)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)
  const anthropicApiKey = useSettingsStore((s) => s.anthropicApiKey)
  const openaiApiKey = useSettingsStore((s) => s.openaiApiKey)
  const selectedModel = useSettingsStore((s) => s.selectedModel)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel)

  const [anthropicInput, setAnthropicInput] = useState(anthropicApiKey)
  const [openaiInput, setOpenaiInput] = useState(openaiApiKey)

  if (!settingsOpen) return null

  const handleSave = async () => {
    if (anthropicInput !== anthropicApiKey) {
      await setApiKey('anthropic', anthropicInput)
    }
    if (openaiInput !== openaiApiKey) {
      await setApiKey('openai', openaiInput)
    }
    toggleSettings()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] rounded-xl bg-white dark:bg-neutral-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-6 py-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={toggleSettings}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Default Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Anthropic API Key */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={anthropicInput}
              onChange={(e) => setAnthropicInput(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openaiInput}
              onChange={(e) => setOpenaiInput(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-700 px-6 py-4">
          <button
            onClick={toggleSettings}
            className="rounded-lg px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
