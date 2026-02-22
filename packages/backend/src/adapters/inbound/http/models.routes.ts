import { Router } from 'express'
import type { LLMGatewayResolver } from '../../../domain/ports/outbound/llm-gateway.resolver'

export function createModelsRoutes(llmResolver: LLMGatewayResolver): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    const models = llmResolver.listAllModels()
    res.json(models)
  })

  return router
}
