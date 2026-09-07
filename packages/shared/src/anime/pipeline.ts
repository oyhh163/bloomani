import type { AgentRole, AgentRunEvent } from './agents.js'
import type { ProjectStatus } from './project.js'

/** Pipeline stages mapped to director orchestration */

export type PipelineStage =
  /** 阶段 0：立项萃取（钩子/卖点/集数规划） */
  | 'production'
  | 'art_direction'
  | 'screenplay'
  /** 阶段 1：分集拆解 + 3-5-3 卡点标注 */
  | 'episode_breakdown'
  | 'character_design'
  | 'scene_design'
  | 'storyboard'
  | 'animate'
  /** 阶段 4 质量门：角色/场景一致性、动作连贯、首尾帧可衔接 */
  | 'qa_review'
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
  /** 内容生成页选定的角色，注入到项目后进入分镜 */
  characterIds?: string[]
  /** 内容生成页选定的剧情集，仅这些集会进入成片 */
  episodeIds?: string[]
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
  'production',
  'art_direction',
  'screenplay',
  'episode_breakdown',
  'character_design',
  'scene_design',
  'storyboard',
  'animate',
  'qa_review',
  'edit',
  'audio',
  'export',
]

export const STAGE_AGENT_MAP: Record<PipelineStage, AgentRole> = {
  production: 'director',
  art_direction: 'art_director',
  screenplay: 'scriptwriter',
  episode_breakdown: 'scriptwriter',
  character_design: 'character_designer',
  scene_design: 'scene_designer',
  storyboard: 'storyboarder',
  animate: 'animator',
  qa_review: 'director',
  edit: 'post_editor',
  audio: 'audio_director',
  export: 'director',
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  production: '立项萃取',
  art_direction: '艺术定调',
  screenplay: '剧本改编',
  episode_breakdown: '分集卡点',
  character_design: '角色定妆',
  scene_design: '场景设计',
  storyboard: '分镜拆解',
  animate: '镜头生成',
  qa_review: '质量检查',
  edit: '剪辑合成',
  audio: '配音配乐',
  export: '成片导出',
}
