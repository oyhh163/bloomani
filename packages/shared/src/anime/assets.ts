/** Global asset memory — characters, scenes, styles */

export type AssetKind = 'character' | 'scene' | 'style' | 'audio' | 'reference'

export interface AssetBase {
  id: string
  kind: AssetKind
  name: string
  projectId?: string
  /** When true, reusable across projects (IP library) */
  libraryScoped: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CharacterVisualLock {
  face: string
  hair: string
  outfit: string
  proportions: string
  accessories: string[]
  /** Free-form identity prompt injected into every shot */
  identityPrompt: string
}

export type CharacterView =
  | 'front'
  | 'three_quarter'
  | 'side'
  | 'back'
  | 'expression'

export interface CharacterSheetImage {
  view: CharacterView
  expression?: string
  url: string
}

/**
 * High-dim identity memory. In production this is a vector embedding
 * (face/style encoder) stored in pgvector / Redis; here we keep a stub handle.
 */
export interface IdentityMemory {
  embeddingId: string
  model: string
  dimensions?: number
}

export interface CharacterAsset extends AssetBase {
  kind: 'character'
  bio?: string
  personality?: string
  visualLock: CharacterVisualLock
  sheets: CharacterSheetImage[]
  identityMemory?: IdentityMemory
  styleId?: string
}

export interface SceneEnvironmentMeta {
  timeOfDay?: string
  weather?: string
  mood?: string
  lighting?: string
  keyProps: string[]
}

export interface SceneAsset extends AssetBase {
  kind: 'scene'
  description: string
  environment: SceneEnvironmentMeta
  referenceUrls: string[]
  /** Prompt / LoRA / ref pack passed to animator */
  consistencyPrompt: string
}

export interface StyleProfile extends AssetBase {
  kind: 'style'
  label: string
  palette: string[]
  lightingMood: string
  aspectRatio: string
  /** Style keywords injected into image/video prompts */
  stylePrompt: string
  preferredRenderModels: string[]
}

export type StudioAsset = CharacterAsset | SceneAsset | StyleProfile

export interface CreateCharacterInput {
  name: string
  bio?: string
  personality?: string
  description: string
  referenceUrls?: string[]
  styleId?: string
  projectId?: string
  libraryScoped?: boolean
}

export interface CreateSceneInput {
  name: string
  description: string
  environment?: Partial<SceneEnvironmentMeta>
  referenceUrls?: string[]
  projectId?: string
  libraryScoped?: boolean
}
