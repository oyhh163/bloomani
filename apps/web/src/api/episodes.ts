import type {
  ApiResponse,
  BuildEpisodesInput,
  Episode,
  EpisodeBreakdownResult,
} from '@bloomani/shared'
import { apiGet, apiPatch, apiPost } from './client'

/** 阶段 1：分集拆解 + 3-5-3 卡点标注 */
export async function breakdownEpisodes(
  input: BuildEpisodesInput,
): Promise<EpisodeBreakdownResult> {
  const result = await apiPost<ApiResponse<EpisodeBreakdownResult>>(
    '/api/episodes/breakdown',
    input,
  )
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** 重跑 storyboard 阶段：基于已定型角色/场景，为分镜注入视觉/视频 prompt 与锚点 */
export async function refreshEpisodePrompts(
  projectId: string,
): Promise<number> {
  const result = await apiPost<ApiResponse<{ refreshedShots: number }>>(
    '/api/episodes/refresh-prompts',
    { projectId },
  )
  if (!result.ok) throw new Error(result.error)
  return result.data.refreshedShots
}

export async function listEpisodes(projectId: string): Promise<Episode[]> {
  const result = await apiGet<ApiResponse<Episode[]>>(`/api/episodes?projectId=${projectId}`)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function getEpisode(episodeId: string): Promise<Episode> {
  const result = await apiGet<ApiResponse<Episode>>(`/api/episodes/${episodeId}`)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** 审查剧本后保存单集修改（标题 / 梗概） */
export async function updateEpisode(
  episodeId: string,
  patch: Partial<Pick<Episode, 'title' | 'synopsis' | 'index'>>,
): Promise<Episode> {
  const result = await apiPatch<ApiResponse<Episode>>(`/api/episodes/${episodeId}`, patch)
  if (!result.ok) throw new Error(result.error)
  return result.data
}
