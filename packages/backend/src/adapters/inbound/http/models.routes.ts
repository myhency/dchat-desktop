import { Router } from 'express'
import type { LLMAdapterFactory } from '../../outbound/llm/llm-adapter.factory'

export function createModelsRoutes(llmFactory: LLMAdapterFactory): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    const models = llmFactory.listAllModels()
    res.json(models)
  })

  return router
}
