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
 * A single canonical angle on a turnaround sheet.
 * Combines the view axis + a free-form pose / framing hint that the
 * illustrator can vary (e.g. "A-pose", "hands on hips").
 */
export interface CharacterTurnaroundSlot {
  /** Stable id, e.g. "front", "back", "side", "head" */
  id: string
  /** Display label, e.g. "正面", "背面", "侧面", "头像" */
  label: string
  view: CharacterView
  /** Pose / framing hint baked into the prompt */
  pose: string
  /** Cached generated image */
  url?: string
  /** Free-form status (idle | generating | failed) */
  status?: 'idle' | 'generating' | 'failed'
}

/** Bundle of turnaround views produced together for a single character. */
export interface CharacterTurnaround {
  generatedAt?: string
  slots: CharacterTurnaroundSlot[]
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
  /** Short marketing tagline, e.g. "冰蓝长发精灵歌姬" */
  tagline?: string
  visualLock: CharacterVisualLock
  sheets: CharacterSheetImage[]
  /** Multi-view turnaround bundle (front / back / side / head) */
  turnaround?: CharacterTurnaround
  identityMemory?: IdentityMemory
  styleId?: string
  /** Snapshot of the style used to render the character, stored on the asset
   *  so it survives even if the style record is edited later. */
  styleSnapshot?: {
    id?: string
    label: string
    palette: string[]
    stylePrompt: string
  }
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
  tagline?: string
  description: string
  referenceUrls?: string[]
  /** Generated turnaround sheets (url per view) */
  sheets?: CharacterSheetImage[]
  /** Optional pre-built turnaround bundle (multi-view) */
  turnaround?: CharacterTurnaround
  styleId?: string
  styleSnapshot?: CharacterAsset['styleSnapshot']
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
