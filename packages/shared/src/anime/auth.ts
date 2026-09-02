import type { CharacterAsset } from './assets.js'
import type { Project } from './project.js'
import type { StoryDraft } from './storyDraft.js'

/** Auth & account contracts */

export interface AuthUser {
  id: string
  username: string
  displayName: string
  createdAt: string
}

export interface RegisterInput {
  username: string
  password: string
  displayName?: string
}

export interface LoginInput {
  username: string
  password: string
}

export interface AuthSession {
  token: string
  user: AuthUser
  expiresAt: string
}

export interface WorkspaceSnapshot {
  user: AuthUser
  projects: Project[]
  characters: CharacterAsset[]
  storyDrafts: StoryDraft[]
}
