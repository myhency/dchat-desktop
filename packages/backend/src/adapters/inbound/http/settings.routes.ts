import { Router, type Request, type Response, type NextFunction } from 'express'
import type { ManageSettingsUseCase } from '../../../domain/ports/inbound/manage-settings.usecase'
import type { LLMGatewayResolver } from '../../../domain/ports/outbound/llm-gateway.resolver'
import type { SetSettingRequest } from '@dchat/shared'

const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

export function createSettingsRoutes(
  settingsService: ManageSettingsUseCase,
  llmResolver: LLMGatewayResolver
): Router {
  const router = Router()

  router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const all = await settingsService.getAll()
    res.json(all)
  }))

  router.get('/:key', asyncHandler(async (req: Request, res: Response) => {
    const value = await settingsService.get(req.params.key)
    res.json({ value })
  }))

  router.put('/:key', asyncHandler(async (req: Request, res: Response) => {
    const { value } = req.body as SetSettingRequest
    await settingsService.set(req.params.key, value)

    // API 키 또는 Base URL 변경 시 LLM 어댑터 갱신
    if (req.params.key === 'anthropic_api_key') {
      const baseUrl = await settingsService.get('anthropic_base_url')
      llmResolver.configureProvider('anthropic', value, baseUrl || undefined)
    } else if (req.params.key === 'anthropic_base_url') {
      const apiKey = await settingsService.get('anthropic_api_key')
      if (apiKey) llmResolver.configureProvider('anthropic', apiKey, value || undefined)
    } else if (req.params.key === 'openai_api_key') {
      const baseUrl = await settingsService.get('openai_base_url')
      llmResolver.configureProvider('openai', value, baseUrl || undefined)
    } else if (req.params.key === 'openai_base_url') {
      const apiKey = await settingsService.get('openai_api_key')
      if (apiKey) llmResolver.configureProvider('openai', apiKey, value || undefined)
    }

    res.json({ ok: true })
  }))

  router.post('/connection-test', asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.body as { provider: 'anthropic' | 'openai' }
    await llmResolver.testConnection(provider)
    res.json({ ok: true })
  }))

  return router
}
