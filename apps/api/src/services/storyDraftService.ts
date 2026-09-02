import type {
  CreateStoryDraftInput,
  StoryDraft,
  UpdateStoryDraftInput,
} from '@bloomani/shared'
import { env } from '../config/env.js'
import {
  createStoryDraftPg,
  deleteStoryDraftPg,
  getStoryDraftPg,
  listStoryDraftsPg,
  updateStoryDraftPg,
} from '../repositories/storyDraftRepo.js'
import { id, nowIso } from '../store/memory.js'

const memoryDrafts = new Map<string, StoryDraft>()

export async function listStoryDrafts(userId = env.defaultUserId): Promise<StoryDraft[]> {
  if (env.storageDriver === 'postgres') {
    return listStoryDraftsPg(userId)
  }
  return [...memoryDrafts.values()]
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function createStoryDraft(
  input: CreateStoryDraftInput,
  userId = env.defaultUserId,
): Promise<StoryDraft> {
  if (env.storageDriver === 'postgres') {
    return createStoryDraftPg({ ...input, userId })
  }
  const stamp = nowIso()
  const draft: StoryDraft = {
    id: id('draft'),
    userId: input.userId ?? userId,
    title: input.title.trim() || '未命名剧本',
    body: input.body,
    source: input.source ?? 'write',
    createdAt: stamp,
    updatedAt: stamp,
  }
  memoryDrafts.set(draft.id, draft)
  return draft
}

export async function updateStoryDraft(
  draftId: string,
  input: UpdateStoryDraftInput,
): Promise<StoryDraft | undefined> {
  if (env.storageDriver === 'postgres') {
    return updateStoryDraftPg(draftId, input)
  }
  const existing = memoryDrafts.get(draftId)
  if (!existing) return undefined
  const next: StoryDraft = {
    ...existing,
    title: input.title ?? existing.title,
    body: input.body ?? existing.body,
    source: input.source ?? existing.source,
    updatedAt: nowIso(),
  }
  memoryDrafts.set(draftId, next)
  return next
}

export async function getStoryDraft(draftId: string): Promise<StoryDraft | undefined> {
  if (env.storageDriver === 'postgres') {
    return getStoryDraftPg(draftId)
  }
  return memoryDrafts.get(draftId)
}

export async function deleteStoryDraft(draftId: string): Promise<boolean> {
  if (env.storageDriver === 'postgres') {
    return deleteStoryDraftPg(draftId)
  }
  return memoryDrafts.delete(draftId)
}
