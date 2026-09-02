import { Hono } from 'hono'
import type {
  ApiResponse,
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  WorkspaceSnapshot,
} from '@bloomani/shared'
import {
  loginUser,
  logoutSession,
  registerUser,
} from '../auth/authService.js'
import { requireAuth, type AuthVariables } from '../auth/middleware.js'
import { env } from '../config/env.js'
import { listLibraryCharactersPg } from '../repositories/characterRepo.js'
import { listProjectsPg } from '../repositories/projectRepo.js'
import { listStoryDraftsPg } from '../repositories/storyDraftRepo.js'
import { listLibraryCharacters } from '../services/assetMemory.js'
import { listProjects } from '../services/director.js'
import { listStoryDrafts } from '../services/storyDraftService.js'

export const authRoutes = new Hono<{ Variables: AuthVariables }>()

authRoutes.post('/register', async (c) => {
  if (env.storageDriver !== 'postgres') {
    return c.json({ ok: false, error: '注册需要 Postgres 存储', code: 'UNAVAILABLE' }, 503)
  }
  const input = (await c.req.json()) as RegisterInput
  try {
    const session = await registerUser(input)
    const body: ApiResponse<AuthSession> = { ok: true, data: session }
    return c.json(body, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败'
    const code = (error as { code?: string }).code ?? 'AUTH_ERROR'
    const status = code === 'CONFLICT' ? 409 : code === 'VALIDATION' ? 400 : 400
    return c.json({ ok: false, error: message, code }, status)
  }
})

authRoutes.post('/login', async (c) => {
  if (env.storageDriver !== 'postgres') {
    return c.json({ ok: false, error: '登录需要 Postgres 存储', code: 'UNAVAILABLE' }, 503)
  }
  const input = (await c.req.json()) as LoginInput
  try {
    const session = await loginUser(input)
    const body: ApiResponse<AuthSession> = { ok: true, data: session }
    return c.json(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败'
    return c.json({ ok: false, error: message, code: 'UNAUTHORIZED' }, 401)
  }
})

authRoutes.post('/logout', async (c) => {
  const token = c.get('token')
  if (token && env.storageDriver === 'postgres') {
    await logoutSession(token)
  }
  const body: ApiResponse<{ loggedOut: boolean }> = { ok: true, data: { loggedOut: true } }
  return c.json(body)
})

authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')!
  const body: ApiResponse<AuthUser> = { ok: true, data: user }
  return c.json(body)
})

authRoutes.get('/workspace', requireAuth, async (c) => {
  const user = c.get('user')!
  const userId = user.id

  const [projects, characters, storyDrafts] =
    env.storageDriver === 'postgres'
      ? await Promise.all([
          listProjectsPg(userId),
          listLibraryCharactersPg(userId),
          listStoryDraftsPg(userId),
        ])
      : await Promise.all([
          listProjects(userId),
          listLibraryCharacters(userId),
          listStoryDrafts(userId),
        ])

  const body: ApiResponse<WorkspaceSnapshot> = {
    ok: true,
    data: { user, projects, characters, storyDrafts },
  }
  return c.json(body)
})
