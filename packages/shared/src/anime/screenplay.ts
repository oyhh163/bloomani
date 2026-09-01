/** Screenplay → scenes → shots (executable for video models) */

export type CameraShotSize =
  | 'extreme_wide'
  | 'wide'
  | 'medium'
  | 'close_up'
  | 'extreme_close_up'
  | 'pov'

export type CameraMove =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'dolly'
  | 'track'
  | 'crane'
  | 'handheld'
  | 'zoom'

export interface DialogueLine {
  characterId?: string
  characterName: string
  text: string
  voiceOver?: boolean
}

export interface ScreenplayBeat {
  id: string
  act: 1 | 2 | 3
  summary: string
  emotion: string
}

export interface ScreenplayScene {
  id: string
  index: number
  title: string
  location: string
  timeOfDay?: string
  summary: string
  characterIds: string[]
  sceneAssetId?: string
}

/**
 * Shot spec — the unit the Animator + model router consume.
 * Inspired by PenShot-style script→prompt decomposition.
 */
export interface ShotSpec {
  id: string
  index: number
  sceneId: string
  title: string
  durationSec: number
  camera: {
    size: CameraShotSize
    move: CameraMove
    notes?: string
  }
  characterIds: string[]
  sceneAssetId?: string
  action: string
  dialogue: DialogueLine[]
  emotion: string
  continuityNotes?: string
  /** Optimized prompt for the chosen render backend */
  visualPrompt: string
  storyboardImageUrl?: string
  clipUrl?: string
  selectedModelId?: string
  routeReason?: string
}

export interface Screenplay {
  id: string
  projectId: string
  logline: string
  synopsis: string
  targetDurationSec: number
  beats: ScreenplayBeat[]
  scenes: ScreenplayScene[]
  shots: ShotSpec[]
  rawScript?: string
  updatedAt: string
}

export interface CreateFromIdeaInput {
  idea: string
  targetDurationSec?: number
  language?: string
  aspectRatio?: string
  styleHints?: string[]
  mode?: InteractionMode
}

export interface ImportScriptInput {
  script: string
  targetDurationSec?: number
  language?: string
  aspectRatio?: string
  styleHints?: string[]
  mode?: InteractionMode
}

export type InteractionMode = 'hosted' | 'chat'
