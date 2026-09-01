import type { AgentRole, AgentRunEvent } from './agents.js'
import type { ProjectStatus } from './project.js'

/** Pipeline stages mapped to director orchestration */

export type PipelineStage =
  | 'art_direction'
  | 'screenplay'
  | 'character_design'
  | 'scene_design'
  | 'storyboard'
  | 'animate'
  | 'edit'
  | 'audio'
  | 'export'

export type PipelineJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export interface PipelineStageState {
  stage: PipelineStage
  status: PipelineJobStatus
  agentRole: AgentRole
  progress: number
  message?: string
  startedAt?: string
  finishedAt?: string
}

export interface PipelineJob {
  id: string
  projectId: string
  status: PipelineJobStatus
  currentStage?: PipelineStage
  stages: PipelineStageState[]
  events: AgentRunEvent[]
  createdAt: string
  updatedAt: string
  error?: string
}

export interface StartPipelineInput {
  projectId: string
  /** Hosted = full auto; chat = wait for approvals between stages */
  mode?: 'hosted' | 'chat'
  /** Skip early stages if assets/script already exist */
  fromStage?: PipelineStage
}

export interface TimelineClip {
  id: string
  shotId: string
  startSec: number
  endSec: number
  sourceUrl?: string
  transition?: 'cut' | 'dissolve' | 'match_cut'
}

export interface TimelineAudioTrack {
  id: string
  kind: 'bgm' | 'sfx' | 'dialogue'
  url?: string
  startSec: number
  endSec: number
  gainDb?: number
}

export interface Timeline {
  id: string
  projectId: string
  clips: TimelineClip[]
  audio: TimelineAudioTrack[]
  durationSec: number
  updatedAt: string
}

export interface PipelineProgressPayload {
  job: PipelineJob
  projectStatus: ProjectStatus
}

/** Canonical stage order for the director agent */
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'art_direction',
  'screenplay',
  'character_design',
  'scene_design',
  'storyboard',
  'animate',
  'edit',
  'audio',
  'export',
]

export const STAGE_AGENT_MAP: Record<PipelineStage, AgentRole> = {
  art_direction: 'art_director',
  screenplay: 'scriptwriter',
  character_design: 'character_designer',
  scene_design: 'scene_designer',
  storyboard: 'storyboarder',
  animate: 'animator',
  edit: 'post_editor',
  audio: 'audio_director',
  export: 'director',
}
