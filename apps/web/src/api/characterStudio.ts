import type {
  ApiResponse,
  CharacterAsset,
  CharacterStylePreset,
} from '@bloomani/shared'
import { apiGet, apiPost } from './client'

export interface CharacterStylePresetSummary {
  id: string
  label: string
  description: string
  palette: string[]
  lightingMood: string
}

export async function listCharacterStylePresets(): Promise<CharacterStylePresetSummary[]> {
  const result = await apiGet<
    ApiResponse<CharacterStylePresetSummary[]>
  >('/api/character-studio/styles')
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export interface CreateTurnaroundRequest {
  name: string
  bio?: string
  personality?: string
  tagline?: string
  description: string
  stylePresetId?: string
  styleId?: string
  referenceUrls?: string[]
  projectId?: string
  libraryScoped?: boolean
}

export async function createCharacterTurnaround(
  body: CreateTurnaroundRequest,
): Promise<CharacterAsset> {
  const result = await apiPost<ApiResponse<CharacterAsset>>(
    '/api/character-studio/turnaround',
    body,
  )
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export interface RegenerateTurnaroundRequest {
  characterId: string
  stylePresetId?: string
  styleId?: string
  tagline?: string
  slotIds?: string[]
  seedReferenceUrl?: string
}

export async function regenerateCharacterTurnaround(
  body: RegenerateTurnaroundRequest,
): Promise<CharacterAsset> {
  const result = await apiPost<ApiResponse<CharacterAsset>>(
    '/api/character-studio/turnaround/regenerate',
    body,
  )
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export type { CharacterStylePreset }