import type { StyleProfile } from './assets.js'
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
}
