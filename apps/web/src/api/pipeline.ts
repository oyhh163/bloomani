import type { ApiResponse, PipelineJob, StartPipelineInput } from '@bloomani/shared'
import { apiGet, apiPost } from './client'

export async function startPipeline(input: StartPipelineInput): Promise<PipelineJob> {
  const result = await apiPost<ApiResponse<PipelineJob>>('/api/pipeline/start', input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function getPipelineJob(jobId: string): Promise<PipelineJob> {
  const result = await apiGet<ApiResponse<PipelineJob>>(`/api/pipeline/jobs/${jobId}`)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function listPipelineJobs(projectId?: string): Promise<PipelineJob[]> {
  const query = projectId ? `?projectId=${projectId}` : ''
  const result = await apiGet<ApiResponse<PipelineJob[]>>(`/api/pipeline/jobs${query}`)
  if (!result.ok) throw new Error(result.error)
  return result.data
}
