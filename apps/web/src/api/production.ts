import type {
  ApiResponse,
  ExtractProductionInput,
  ProductionExtractResult,
  ProductionMeta,
  QualityGateReportData,
} from '@bloomani/shared'
import { apiGet, apiPost } from './client'

/** 阶段 0：立项萃取（钩子 / 卖点 / 集数规划 / 角色矩阵） */
export async function extractProduction(
  input: ExtractProductionInput,
): Promise<ProductionExtractResult> {
  const result = await apiPost<ApiResponse<ProductionExtractResult>>(
    '/api/production/extract',
    input,
  )
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function fetchProduction(projectId: string): Promise<ProductionMeta> {
  const result = await apiGet<ApiResponse<ProductionMeta>>(`/api/production/${projectId}`)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** 阶段 4：质量门静态检查 */
export async function runQualityGate(projectId: string): Promise<QualityGateReportData> {
  const result = await apiPost<ApiResponse<QualityGateReportData>>(
    `/api/production/${projectId}/qa`,
    {},
  )
  if (!result.ok) throw new Error(result.error)
  return result.data
}
