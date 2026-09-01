import type { ModelCapability, ModelRouteDecision, ModelRouteRequest } from '@bloomani/shared'
import { MODEL_CATALOG } from '@bloomani/shared'

/**
 * Model router skeleton — Art Director / Animator consult this layer.
 * Replace scoring with cost/latency/quality telemetry later.
 */
export function routeModel(request: ModelRouteRequest): ModelRouteDecision {
  const candidates = MODEL_CATALOG.filter((m) =>
    m.capabilities.includes(request.capability),
  ).sort((a, b) => score(b, request) - score(a, request))

  if (candidates.length === 0) {
    return {
      modelId: 'claude-3.5-sonnet',
      reason: `No catalog match for ${request.capability}; falling back to LLM`,
      alternatives: [],
    }
  }

  const [best, ...rest] = candidates
  return {
    modelId: best.id,
    reason: explain(best.id, request),
    alternatives: rest.slice(0, 3).map((m) => m.id),
  }
}

function score(
  model: (typeof MODEL_CATALOG)[number],
  request: ModelRouteRequest,
): number {
  let value = model.priority

  if (request.cinematic && model.id === 'sora-2') value += 20
  if (request.needsNativeAudio && model.id === 'veo-3.1') value += 20
  if (request.needsCharacterPerformance && model.id === 'kling') value += 15
  if (request.needsCharacterPerformance && model.id === 'dreamactor-m1') value += 18

  if (request.styleHints?.some((h) => /anime|漫画|二次元/i.test(h))) {
    if (model.id === 'seedance-2' || model.id === 'kling') value += 8
  }

  return value
}

function explain(modelId: string, request: ModelRouteRequest): string {
  if (request.cinematic && modelId === 'sora-2') {
    return 'Cinematic look → Sora 2'
  }
  if (request.needsNativeAudio && modelId === 'veo-3.1') {
    return 'Native audio preference → Veo 3.1'
  }
  if (request.needsCharacterPerformance && modelId === 'kling') {
    return 'Human motion / performance → Kling'
  }
  if (request.needsCharacterPerformance && modelId === 'dreamactor-m1') {
    return 'Character performance focus → DreamActor-M1'
  }
  return `Best catalog match for capability=${request.capability}`
}

export function listModelsByCapability(capability?: ModelCapability) {
  if (!capability) return MODEL_CATALOG
  return MODEL_CATALOG.filter((m) => m.capabilities.includes(capability))
}
