import { desc, eq } from 'drizzle-orm'
import type {
  CreateStoryDraftInput,
  StoryDraft,
  StoryDraftSource,
  UpdateStoryDraftInput,
} from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { storyDrafts } from '../db/schema.js'
import { id } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapRow(row: typeof storyDrafts.$inferSelect): StoryDraft {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    source: row.source as StoryDraftSource,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

export async function listStoryDraftsPg(userId = env.defaultUserId): Promise<StoryDraft[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(storyDrafts)
    .where(eq(storyDrafts.userId, userId))
    .orderBy(desc(storyDrafts.updatedAt))
  return rows.map(mapRow)
}

export async function createStoryDraftPg(input: CreateStoryDraftInput): Promise<StoryDraft> {
  const db = getDb()
  const stamp = new Date()
  const draftId = id('draft')
  const [row] = await db
    .insert(storyDrafts)
    .values({
      id: draftId,
      userId: input.userId ?? env.defaultUserId,
      title: input.title.trim() || '未命名剧本',
      body: input.body,
      source: input.source ?? 'write',
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
  return mapRow(row)
}

export async function updateStoryDraftPg(
  draftId: string,
  input: UpdateStoryDraftInput,
): Promise<StoryDraft | undefined> {
  const db = getDb()
  const [row] = await db
    .update(storyDrafts)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      updatedAt: new Date(),
    })
    .where(eq(storyDrafts.id, draftId))
    .returning()
  return row ? mapRow(row) : undefined
}

export async function getStoryDraftPg(draftId: string): Promise<StoryDraft | undefined> {
  const db = getDb()
  const [row] = await db.select().from(storyDrafts).where(eq(storyDrafts.id, draftId)).limit(1)
  return row ? mapRow(row) : undefined
}

export async function deleteStoryDraftPg(draftId: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db.delete(storyDrafts).where(eq(storyDrafts.id, draftId)).returning({
    id: storyDrafts.id,
  })
  return deleted.length > 0
}
