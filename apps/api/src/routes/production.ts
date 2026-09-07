import { Hono } from 'hono'
import type {
  ApiResponse,
  ExtractProductionInput,
  ProductionExtractResult,
  QualityGateReportData,
} from '@bloomani/shared'
import type { AuthVariables } from '../auth/middleware.js'
import { requireAuth } from '../auth/middleware.js'
import { runQualityGate } from '../services/episodeService.js'
import { runProductionStage } from '../services/productionService.js'
import { loadProject } from '../services/projectStore.js'

export const productionRoutes = new Hono<{ Variables: AuthVariables }>()

/** 阶段 0：立项萃取（钩子/卖点/受众/集数规划/角色矩阵） */
productionRoutes.post('/extract', requireAuth, async (c) => {
  const input = (await c.req.json()) as ExtractProductionInput
  if (!input?.projectId || !input?.text?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'projectId and text are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const project = await loadProject(input.projectId)
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }

  const result = await runProductionStage(input.projectId, {
    source: input.source,
    text: input.text,
    episodeCount: input.episodeCount,
    episodeDurationSec: input.episodeDurationSec,
    genres: input.genres,
  })

  const body: ApiResponse<ProductionExtractResult> = { ok: true, data: result }
  return c.json(body)
})

/** 读取项目的立项信息 */
productionRoutes.get('/:projectId', requireAuth, async (c) => {
  const project = await loadProject(c.req.param('projectId'))
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  if (!project.productionMeta) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'production meta not found, run extract first',
      code: 'NOT_FOUND',
    }
    return c.json(fail, 404)
  }

  const body: ApiResponse<typeof project.productionMeta> = {
    ok: true,
    data: project.productionMeta,
  }
  return c.json(body)
})

/** 阶段 4 质量门：手动触发一次静态检查 */
productionRoutes.post('/:projectId/qa', requireAuth, async (c) => {
  const projectId = c.req.param('projectId')
  const project = await loadProject(projectId)
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }

  const report = await runQualityGate(projectId, c.get('userId'))
  const body: ApiResponse<QualityGateReportData> = { ok: true, data: report }
  return c.json(body)
})
