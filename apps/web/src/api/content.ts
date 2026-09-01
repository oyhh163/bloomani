import type { ApiResponse, LandingContent } from '@bloomani/shared'
import { apiGet } from './client'

export async function fetchLandingContent(): Promise<LandingContent> {
  const result = await apiGet<ApiResponse<LandingContent>>('/api/content/landing')

  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.data
}
