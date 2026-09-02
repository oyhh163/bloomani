import { Hono } from 'hono'
import type {
  ApiResponse,
  CharacterAsset,
  CreateCharacterInput,
  CreateSceneInput,
  SceneAsset,
} from '@bloomani/shared'
import type { AuthVariables } from '../auth/middleware.js'
import { requireAuth } from '../auth/middleware.js'
import {
  createCharacter,
  createScene,
  deleteCharacter,
  getCharacter,
  listLibraryCharacters,
  listScenes,
} from '../services/assetMemory.js'

export const assetRoutes = new Hono<{ Variables: AuthVariables }>()

assetRoutes.get('/characters', requireAuth, async (c) => {
  const data = await listLibraryCharacters(c.get('userId'))
  const body: ApiResponse<CharacterAsset[]> = { ok: true, data }
  return c.json(body)
})

assetRoutes.post('/characters', requireAuth, async (c) => {
  const input = (await c.req.json()) as CreateCharacterInput
  if (!input?.name?.trim() || !input?.description?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'name and description are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const character = await createCharacter(input, c.get('userId'))
  const body: ApiResponse<CharacterAsset> = { ok: true, data: character }
  return c.json(body, 201)
})

assetRoutes.get('/characters/:characterId', requireAuth, async (c) => {
  const character = await getCharacter(c.req.param('characterId'))
  if (!character) {
    const fail: ApiResponse<never> = { ok: false, error: 'character not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<CharacterAsset> = { ok: true, data: character }
  return c.json(body)
})

assetRoutes.post('/characters/:characterId/delete', requireAuth, async (c) => {
  const characterId = c.req.param('characterId')
  const existed = Boolean(await getCharacter(characterId))
  if (!existed) {
    const fail: ApiResponse<never> = { ok: false, error: 'character not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  await deleteCharacter(characterId)
  const body: ApiResponse<{ deleted: boolean }> = { ok: true, data: { deleted: true } }
  return c.json(body)
})

assetRoutes.delete('/characters/:characterId', requireAuth, async (c) => {
  const characterId = c.req.param('characterId')
  const existed = Boolean(await getCharacter(characterId))
  if (!existed) {
    const fail: ApiResponse<never> = { ok: false, error: 'character not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  await deleteCharacter(characterId)
  const body: ApiResponse<{ deleted: boolean }> = { ok: true, data: { deleted: true } }
  return c.json(body)
})

assetRoutes.get('/scenes', requireAuth, async (c) => {
  const projectId = c.req.query('projectId')
  const body: ApiResponse<SceneAsset[]> = { ok: true, data: await listScenes(projectId) }
  return c.json(body)
})

assetRoutes.post('/scenes', requireAuth, async (c) => {
  const input = (await c.req.json()) as CreateSceneInput
  if (!input?.name?.trim() || !input?.description?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'name and description are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const scene = await createScene(input, c.get('userId'))
  const body: ApiResponse<SceneAsset> = { ok: true, data: scene }
  return c.json(body, 201)
})
