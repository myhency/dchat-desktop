import { ipcMain } from 'electron'
import type { ManageSettingsUseCase } from '../../../domain/ports/inbound/manage-settings.usecase'
import type { LLMAdapterFactory } from '../../outbound/llm/llm-adapter.factory'
import { IPC_CHANNELS } from './channels'

export class SettingsIpcHandler {
  constructor(
    private readonly settingsService: ManageSettingsUseCase,
    private readonly llmFactory: LLMAdapterFactory
  ) {}

  register(): void {
    ipcMain.handle(
      IPC_CHANNELS.SETTINGS.GET,
      async (_event, key: string) => {
        return this.settingsService.get(key)
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.SETTINGS.SET,
      async (_event, key: string, value: string) => {
        await this.settingsService.set(key, value)

        // API 키 변경 시 LLM 어댑터 갱신
        if (key === 'anthropic_api_key') {
          this.llmFactory.setAnthropicKey(value)
        } else if (key === 'openai_api_key') {
          this.llmFactory.setOpenAIKey(value)
        }
      }
    )

    ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, async () => {
      return this.settingsService.getAll()
    })

    ipcMain.handle(IPC_CHANNELS.LLM.LIST_MODELS, async () => {
      return this.llmFactory.listAllModels()
    })
  }
}
