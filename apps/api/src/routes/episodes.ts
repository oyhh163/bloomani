import { Hono } from 'hono'
import type {
  ApiResponse,
  BuildEpisodesInput,
  Episode,
  EpisodeBreakdownResult,
} from '@bloomani/shared'
import type { AuthVariables } from '../auth/middleware.js'
import { requireAuth } from '../auth/middleware.js'
import { breakdownEpisodes, getEpisode, listEpisodes, refreshEpisodePrompts, updateEpisode } from '../services/episodeService.js'
import { collectPromptContext } from '../services/assetContext.js'
import { loadProject } from '../services/projectStore.js'

export const episodeRoutes = new Hono<{ Variables: AuthVariables }>()

/** 阶段 1：分集拆解 + 3-5-3 卡点标注 */
episodeRoutes.post('/breakdown', requireAuth, async (c) => {
  const input = (await c.req.json()) as BuildEpisodesInput
  if (!input?.projectId) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'projectId is required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const project = await loadProject(input.projectId)
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }

  const userId = c.get('userId')
  try {
    const result = await breakdownEpisodes(input, userId)
    if (result.error && result.episodes.length === 0) {
      const fail: ApiResponse<never> = {
        ok: false,
        error: result.error,
        code: 'VALIDATION',
      }
      return c.json(fail, 400)
    }
    const body: ApiResponse<EpisodeBreakdownResult> = { ok: true, data: result }
    return c.json(body, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'breakdown failed'
    console.error('[episodes/breakdown] failed:', error)
    const fail: ApiResponse<never> = {
      ok: false,
      error: message,
      code: 'INTERNAL',
    }
    return c.json(fail, 500)
  }
})

/** 重跑 storyboard 阶段：基于已定型的角色/场景，为分镜注入视觉/视频 prompt 与锚点 */
episodeRoutes.post('/refresh-prompts', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { projectId } = (await c.req.json()) as { projectId?: string }
  if (!projectId) {
    const fail: ApiResponse<never> = { ok: false, error: 'projectId is required', code: 'VALIDATION' }
    return c.json(fail, 400)
  }
  const project = await loadProject(projectId)
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const ctx = await collectPromptContext(project, userId)
  const refreshedShots = await refreshEpisodePrompts(projectId, ctx, userId)
  const body: ApiResponse<{ refreshedShots: number }> = { ok: true, data: { refreshedShots } }
  return c.json(body)
})

episodeRoutes.get('/', requireAuth, async (c) => {
  const projectId = c.req.query('projectId')
  if (!projectId) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'projectId is required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const body: ApiResponse<Episode[]> = { ok: true, data: await listEpisodes(projectId) }
  return c.json(body)
})

episodeRoutes.get('/:episodeId', requireAuth, async (c) => {
  const episode = await getEpisode(c.req.param('episodeId'))
  if (!episode) {
    const fail: ApiResponse<never> = { ok: false, error: 'episode not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<Episode> = { ok: true, data: episode }
  return c.json(body)
})

/** 审查剧本后保存单集修改（标题 / 梗概） */
episodeRoutes.patch('/:episodeId', requireAuth, async (c) => {
  const episodeId = c.req.param('episodeId')
  const patch = (await c.req.json()) as Partial<Pick<Episode, 'title' | 'synopsis' | 'index'>>
  try {
    const episode = await updateEpisode(episodeId, patch)
    const body: ApiResponse<Episode> = { ok: true, data: episode }
    return c.json(body)
  } catch (error) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: error instanceof Error ? error.message : 'update failed',
      code: 'NOT_FOUND',
    }
    return c.json(fail, 404)
  }
})
