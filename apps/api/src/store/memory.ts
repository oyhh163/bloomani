import { randomUUID } from 'node:crypto'
import type {
  CharacterAsset,
  PipelineJob,
  Project,
  SceneAsset,
  Screenplay,
  StyleProfile,
  Timeline,
} from '@bloomani/shared'

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** In-memory stand-in for Postgres + Redis asset memory */
export const db = {
  projects: new Map<string, Project>(),
  characters: new Map<string, CharacterAsset>(),
  scenes: new Map<string, SceneAsset>(),
  styles: new Map<string, StyleProfile>(),
  screenplays: new Map<string, Screenplay>(),
  timelines: new Map<string, Timeline>(),
  jobs: new Map<string, PipelineJob>(),
}
