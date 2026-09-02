import type {
  ApiResponse,
  CreateVideoInput,
  GenerateImageInput,
  GenerateImageResult,
  VideoTask,
} from '@bloomani/shared'
import { apiGet, apiPost } from './client'

export async function generateCharacterImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  const result = await apiPost<ApiResponse<GenerateImageResult>>('/api/generate/image', input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function createVideoTask(input: CreateVideoInput): Promise<VideoTask> {
  const result = await apiPost<ApiResponse<VideoTask>>('/api/generate/video', input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function getVideoTask(videoId: string): Promise<VideoTask> {
  const result = await apiGet<ApiResponse<VideoTask>>(`/api/generate/video/${videoId}`)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function getGenerateStatus() {
  const result = await apiGet<
    ApiResponse<{ configured: boolean; imageModel: string; videoModel: string }>
  >('/api/generate/status')
  if (!result.ok) throw new Error(result.error)
  return result.data
}
