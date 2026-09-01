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

/** Seed catalog — replace with live registry / feature flags later */
export const MODEL_CATALOG: ModelDescriptor[] = [
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
    priority: 85,
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    modality: 'image',
    capabilities: ['character_sheet', 'scene_still'],
    priority: 75,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    modality: 'image',
    capabilities: ['scene_still', 'character_sheet'],
    priority: 70,
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 95,
    notes: 'Strong cinematic look',
  },
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 92,
    notes: 'Native audio friendly',
  },
  {
    id: 'kling',
    name: 'Kling',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video', 'character_performance'],
    priority: 88,
    notes: 'Strong human motion',
  },
  {
    id: 'seedance-2',
    name: 'Seedance 2.0',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 86,
  },
  {
    id: 'hailuo-02',
    name: 'Hailuo 02',
    modality: 'video',
    capabilities: ['text_to_video', 'image_to_video'],
    priority: 78,
  },
  {
    id: 'dreamactor-m1',
    name: 'DreamActor-M1',
    modality: 'video',
    capabilities: ['character_performance', 'image_to_video'],
    priority: 84,
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
