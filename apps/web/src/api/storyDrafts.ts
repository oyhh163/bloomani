import type {
  ApiResponse,
  CreateStoryDraftInput,
  StoryDraft,
  UpdateStoryDraftInput,
} from '@bloomani/shared'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export async function listStoryDrafts(): Promise<StoryDraft[]> {
  const result = await apiGet<ApiResponse<StoryDraft[]>>('/api/story-drafts')
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function createStoryDraft(input: CreateStoryDraftInput): Promise<StoryDraft> {
  const result = await apiPost<ApiResponse<StoryDraft>>('/api/story-drafts', input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function updateStoryDraft(
  draftId: string,
  input: UpdateStoryDraftInput,
): Promise<StoryDraft> {
  const result = await apiPatch<ApiResponse<StoryDraft>>(`/api/story-drafts/${draftId}`, input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function deleteStoryDraft(draftId: string): Promise<void> {
  const result = await apiDelete<ApiResponse<{ deleted: boolean }>>(`/api/story-drafts/${draftId}`)
  if (!result.ok) throw new Error(result.error)
}
