/** Model router — interchangeable render / LLM backends */

export type ModelModality =
  | 'llm'
  | 'image'
  | 'video'
  | 'audio'
  | 'tts'
  | 'utility'

export type ModelCapability =
  | 'screenplay'
  | 'style_direction'
  | 'character_sheet'
  | 'scene_still'
  | 'storyboard'
  | 'text_to_video'
  | 'image_to_video'
  | 'character_performance'
  | 'edit_timeline'
  | 'music'
  | 'sfx'
  | 'voice'

export interface ModelDescriptor {
  id: string
  name: string
  modality: ModelModality
  capabilities: ModelCapability[]
  /** Soft priority when multiple models match (higher = preferred) */
  priority: number
  notes?: string
}

export interface ModelRouteRequest {
  capability: ModelCapability
  styleHints?: string[]
  needsNativeAudio?: boolean
  needsCharacterPerformance?: boolean
  cinematic?: boolean
}

export interface ModelRouteDecision {
  modelId: string
  reason: string
  alternatives: string[]
}

/** Seed catalog — Agnes is the current default render backend */
export const MODEL_CATALOG: ModelDescriptor[] = [
  {
    id: 'agnes-image-2.5-flash',
    name: 'Agnes Image 2.5 Flash',
    modality: 'image',
    capabilities: ['character_sheet', 'scene_still', 'storyboard'],
    priority: 100,
    notes: 'Default image backend via apihub.agnes-ai.com',
  },
  {
    id: 'agnes-video-v2.0',
    name: 'Agnes Video V2.0',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 100,
    notes: 'Default video backend (async task + poll)',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    modality: 'llm',
    capabilities: ['screenplay', 'style_direction', 'storyboard'],
    priority: 80,
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    modality: 'llm',
    capabilities: ['screenplay', 'style_direction', 'storyboard'],
    priority: 90,
  },
  {
    id: 'flux.1-dev',
    name: 'Flux.1 Dev',
    modality: 'image',
    capabilities: ['character_sheet', 'scene_still', 'storyboard'],
    priority: 70,
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    modality: 'image',
    capabilities: ['character_sheet', 'scene_still'],
    priority: 65,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    modality: 'image',
    capabilities: ['scene_still', 'character_sheet'],
    priority: 60,
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 75,
    notes: 'Strong cinematic look',
  },
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 74,
    notes: 'Native audio friendly',
  },
  {
    id: 'kling',
    name: 'Kling',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video', 'character_performance'],
    priority: 72,
    notes: 'Strong human motion',
  },
  {
    id: 'seedance-2',
    name: 'Seedance 2.0',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 70,
  },
  {
    id: 'hailuo-02',
    name: 'Hailuo 02',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 68,
  },
  {
    id: 'dreamactor-m1',
    name: 'DreamActor-M1',
    modality: 'video',
    capabilities: ['character_performance', 'image_to_video'],
    priority: 71,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    modality: 'tts',
    capabilities: ['voice', 'sfx'],
    priority: 80,
  },
  {
    id: 'gpt-sovits',
    name: 'GPT-SoVITS',
    modality: 'tts',
    capabilities: ['voice'],
    priority: 70,
  },
  {
    id: 'ffmpeg',
    name: 'FFmpeg',
    modality: 'utility',
    capabilities: ['edit_timeline'],
    priority: 100,
  },
]
