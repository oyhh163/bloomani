import { Hono } from 'hono'
import type {
  ApiResponse,
  AgentDescriptor,
  ModelCapability,
  ModelDescriptor,
  ModelRouteDecision,
  ModelRouteRequest,
} from '@bloomani/shared'
import { ANIME_AGENTS } from '@bloomani/shared'
import { listModelsByCapability, routeModel } from '../services/modelRouter.js'

export const metaRoutes = new Hono()

metaRoutes.get('/agents', (c) => {
  const body: ApiResponse<AgentDescriptor[]> = { ok: true, data: ANIME_AGENTS }
  return c.json(body)
})

metaRoutes.get('/models', (c) => {
  const capability = c.req.query('capability') as ModelCapability | undefined
  const body: ApiResponse<ModelDescriptor[]> = {
    ok: true,
    data: listModelsByCapability(capability),
  }
  return c.json(body)
})

metaRoutes.post('/models/route', async (c) => {
  const input = (await c.req.json()) as ModelRouteRequest
  if (!input?.capability) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'capability is required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const decision = routeModel(input)
  const body: ApiResponse<ModelRouteDecision> = { ok: true, data: decision }
  return c.json(body)
})
