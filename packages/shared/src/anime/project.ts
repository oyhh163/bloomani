import type { StyleProfile } from './assets.js'
import type { Episode, ProductionMeta } from './episode.js'
import type { InteractionMode, Screenplay } from './screenplay.js'

export type ProjectStatus =
  | 'draft'
  | 'planning'
  | 'asset_ready'
  | 'storyboard_ready'
  | 'rendering'
  | 'editing'
  | 'completed'
  | 'failed'

export interface Project {
  id: string
  title: string
  idea: string
  userId: string
  status: ProjectStatus
  mode: InteractionMode
  aspectRatio: string
  language: string
  styleId?: string
  characterIds: string[]
  sceneIds: string[]
  screenplayId?: string
  timelineId?: string
  outputUrl?: string
  /** 内容生成时用户选定的剧情集（仅这些集会进入成片） */
  plotEpisodeIds?: string[]
  /** 阶段 0 立项萃取结果 */
  productionMeta?: ProductionMeta
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  title?: string
  idea: string
  mode?: InteractionMode
  aspectRatio?: string
  language?: string
  styleHints?: string[]
  targetDurationSec?: number
  /** Reuse library character IDs */
  characterIds?: string[]
}

export interface ProjectBundle {
  project: Project
  style?: StyleProfile
  screenplay?: Screenplay
  /** 多集短剧的分集列表（按 index 升序） */
  episodes?: Episode[]
}
