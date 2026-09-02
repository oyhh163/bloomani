import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import type {
  AgentRunEvent,
  CharacterVisualLock,
  IdentityMemory,
  PipelineJobStatus,
  PipelineStage,
  PipelineStageState,
  ProjectStatus,
  SceneEnvironmentMeta,
  ScreenplayBeat,
  ScreenplayScene,
  ShotSpec,
  TimelineAudioTrack,
  TimelineClip,
} from '@bloomani/shared'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  idea: text('idea').notNull(),
  status: text('status').$type<ProjectStatus>().notNull().default('draft'),
  mode: text('mode').notNull().default('hosted'),
  aspectRatio: text('aspect_ratio').notNull().default('9:16'),
  language: text('language').notNull().default('zh-CN'),
  styleId: text('style_id'),
  characterIds: jsonb('character_ids').$type<string[]>().notNull().default([]),
  sceneIds: jsonb('scene_ids').$type<string[]>().notNull().default([]),
  screenplayId: text('screenplay_id'),
  timelineId: text('timeline_id'),
  outputUrl: text('output_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const styles = pgTable('styles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  label: text('label').notNull(),
  palette: jsonb('palette').$type<string[]>().notNull().default([]),
  lightingMood: text('lighting_mood').notNull(),
  aspectRatio: text('aspect_ratio').notNull(),
  stylePrompt: text('style_prompt').notNull(),
  preferredRenderModels: jsonb('preferred_render_models').$type<string[]>().notNull().default([]),
  libraryScoped: boolean('library_scoped').notNull().default(false),
  projectId: text('project_id'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const characters = pgTable('characters', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  bio: text('bio'),
  personality: text('personality'),
  libraryScoped: boolean('library_scoped').notNull().default(true),
  projectId: text('project_id'),
  styleId: text('style_id'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  visualLock: jsonb('visual_lock').$type<CharacterVisualLock>().notNull(),
  identityMemory: jsonb('identity_memory').$type<IdentityMemory>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const characterSheets = pgTable('character_sheets', {
  id: text('id').primaryKey(),
  characterId: text('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  view: text('view').notNull(),
  expression: text('expression'),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const projectCharacters = pgTable(
  'project_characters',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.characterId] })],
)

export const scenes = pgTable('scenes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  libraryScoped: boolean('library_scoped').notNull().default(true),
  projectId: text('project_id'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  environment: jsonb('environment').$type<SceneEnvironmentMeta>().notNull(),
  referenceUrls: jsonb('reference_urls').$type<string[]>().notNull().default([]),
  consistencyPrompt: text('consistency_prompt').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storyDrafts = pgTable('story_drafts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  source: text('source').notNull().default('write'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const screenplays = pgTable('screenplays', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  projectId: text('project_id'),
  logline: text('logline').notNull(),
  synopsis: text('synopsis').notNull(),
  targetDurationSec: integer('target_duration_sec').notNull().default(45),
  beats: jsonb('beats').$type<ScreenplayBeat[]>().notNull().default([]),
  scenes: jsonb('scenes').$type<ScreenplayScene[]>().notNull().default([]),
  shots: jsonb('shots').$type<ShotSpec[]>().notNull().default([]),
  rawScript: text('raw_script'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const pipelineJobs = pgTable('pipeline_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').$type<PipelineJobStatus>().notNull().default('queued'),
  currentStage: text('current_stage').$type<PipelineStage>(),
  stages: jsonb('stages').$type<PipelineStageState[]>().notNull().default([]),
  events: jsonb('events').$type<AgentRunEvent[]>().notNull().default([]),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const timelines = pgTable('timelines', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  clips: jsonb('clips').$type<TimelineClip[]>().notNull().default([]),
  audio: jsonb('audio').$type<TimelineAudioTrack[]>().notNull().default([]),
  durationSec: real('duration_sec').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
