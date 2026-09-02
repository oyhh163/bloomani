import type { ApiResponse, CharacterAsset, CreateCharacterInput } from '@bloomani/shared'
import { apiGet, apiPost } from './client'

export async function saveCharacterAsset(input: CreateCharacterInput): Promise<CharacterAsset> {
  const result = await apiPost<ApiResponse<CharacterAsset>>('/api/assets/characters', input)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function listCharacterAssets(): Promise<CharacterAsset[]> {
  const result = await apiGet<ApiResponse<CharacterAsset[]>>('/api/assets/characters')
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function deleteCharacterAsset(characterId: string): Promise<void> {
  const result = await apiPost<ApiResponse<{ deleted: boolean }>>(
    `/api/assets/characters/${characterId}/delete`,
    {},
  )
  if (!result.ok) throw new Error(result.error)
}
