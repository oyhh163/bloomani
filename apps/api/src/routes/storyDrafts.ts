import { Hono } from 'hono'
import type {
  ApiResponse,
  CreateStoryDraftInput,
  StoryDraft,
  UpdateStoryDraftInput,
} from '@bloomani/shared'
import type { AuthVariables } from '../auth/middleware.js'
import { requireAuth } from '../auth/middleware.js'
import {
  createStoryDraft,
  deleteStoryDraft,
  getStoryDraft,
  listStoryDrafts,
  updateStoryDraft,
} from '../services/storyDraftService.js'

export const storyDraftRoutes = new Hono<{ Variables: AuthVariables }>()

storyDraftRoutes.get('/', requireAuth, async (c) => {
  const data = await listStoryDrafts(c.get('userId'))
  const body: ApiResponse<StoryDraft[]> = { ok: true, data }
  return c.json(body)
})

storyDraftRoutes.post('/', requireAuth, async (c) => {
  const input = (await c.req.json()) as CreateStoryDraftInput
  if (!input?.body?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'body is required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const draft = await createStoryDraft(
    {
      title: input.title ?? '未命名剧本',
      body: input.body,
      source: input.source,
    },
    c.get('userId'),
  )
  const body: ApiResponse<StoryDraft> = { ok: true, data: draft }
  return c.json(body, 201)
})

storyDraftRoutes.get('/:draftId', requireAuth, async (c) => {
  const draft = await getStoryDraft(c.req.param('draftId'))
  if (!draft) {
    const fail: ApiResponse<never> = { ok: false, error: 'draft not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<StoryDraft> = { ok: true, data: draft }
  return c.json(body)
})

storyDraftRoutes.patch('/:draftId', requireAuth, async (c) => {
  const input = (await c.req.json()) as UpdateStoryDraftInput
  const draft = await updateStoryDraft(c.req.param('draftId'), input)
  if (!draft) {
    const fail: ApiResponse<never> = { ok: false, error: 'draft not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<StoryDraft> = { ok: true, data: draft }
  return c.json(body)
})

storyDraftRoutes.delete('/:draftId', requireAuth, async (c) => {
  const ok = await deleteStoryDraft(c.req.param('draftId'))
  if (!ok) {
    const fail: ApiResponse<never> = { ok: false, error: 'draft not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<{ deleted: boolean }> = { ok: true, data: { deleted: true } }
  return c.json(body)
})
