/** Screenplay → scenes → shots (executable for video models) */

import type {
  ActionChainStep,
  FrameChain,
  HookType,
  ShotQualityGate,
  ShotTransition,
} from './storyboard.js'

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
  /** 所在场景名（用于归并成 ScreenplayScene） */
  location?: string
  timeOfDay?: string
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
    /** 角度（权力/情绪） */
    angle?: 'high' | 'low' | 'eye'
    notes?: string
  }
  characterIds: string[]
  sceneAssetId?: string
  action: string
  dialogue: DialogueLine[]
  emotion: string
  continuityNotes?: string
  /** 静态关键帧提示词（生图 / 首帧锚定） */
  visualPrompt: string
  /** 动态视频提示词（生视频，独立可执行） */
  videoPrompt?: string
  /** 负面提示词 */
  negativePrompt?: string
  storyboardImageUrl?: string
  clipUrl?: string
  selectedModelId?: string
  routeReason?: string
  /** 所属集（多集短剧）；单集短片可留空 */
  episodeId?: string
  /** 卡点类型（3-5-3 节奏标注） */
  hookType?: HookType
  /** 首尾帧衔接：尾帧即下一镜首帧，保证角色/场景/光线一致 */
  frameChain?: FrameChain
  /** 长动作拆分（>15s 的连续动作拆为多镜） */
  actionChain?: ActionChainStep[]
  /** 与下一镜的过渡方式 */
  transition?: ShotTransition
  /** 质量门检查结果 */
  qa?: ShotQualityGate
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
  /** 原始长文本（小说/剧本全文），供阶段 1 分集拆解使用 */
  rawScript?: string
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
