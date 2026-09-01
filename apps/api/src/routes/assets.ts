import { Hono } from 'hono'
import type {
  ApiResponse,
  CharacterAsset,
  CreateCharacterInput,
  CreateSceneInput,
  SceneAsset,
} from '@bloomani/shared'
import {
  createCharacter,
  createScene,
  getCharacter,
  listLibraryCharacters,
  listScenes,
} from '../services/assetMemory.js'

export const assetRoutes = new Hono()

assetRoutes.get('/characters', (c) => {
  const body: ApiResponse<CharacterAsset[]> = {
    ok: true,
    data: listLibraryCharacters(),
  }
  return c.json(body)
})

assetRoutes.post('/characters', async (c) => {
  const input = (await c.req.json()) as CreateCharacterInput
  if (!input?.name?.trim() || !input?.description?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'name and description are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const character = createCharacter(input)
  const body: ApiResponse<CharacterAsset> = { ok: true, data: character }
  return c.json(body, 201)
})

assetRoutes.get('/characters/:characterId', (c) => {
  const character = getCharacter(c.req.param('characterId'))
  if (!character) {
    const fail: ApiResponse<never> = { ok: false, error: 'character not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<CharacterAsset> = { ok: true, data: character }
  return c.json(body)
})

assetRoutes.get('/scenes', (c) => {
  const projectId = c.req.query('projectId')
  const body: ApiResponse<SceneAsset[]> = { ok: true, data: listScenes(projectId) }
  return c.json(body)
})

assetRoutes.post('/scenes', async (c) => {
  const input = (await c.req.json()) as CreateSceneInput
  if (!input?.name?.trim() || !input?.description?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'name and description are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const scene = createScene(input)
  const body: ApiResponse<SceneAsset> = { ok: true, data: scene }
  return c.json(body, 201)
})
