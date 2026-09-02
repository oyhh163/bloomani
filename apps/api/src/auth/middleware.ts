import { createMiddleware } from 'hono/factory'
import type { AuthUser } from '@bloomani/shared'
import { env } from '../config/env.js'
import { resolveSession } from './authService.js'

export type AuthVariables = {
  userId: string
  user: AuthUser | null
  token: string | null
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null
  const [scheme, value] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null
  return value.trim()
}

/** Attaches user from Bearer token; falls back to DEFAULT_USER_ID when absent. */
export const attachAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const token = extractBearer(c.req.header('Authorization'))
  if (env.storageDriver === 'postgres' && token) {
    const user = await resolveSession(token)
    if (user) {
      c.set('user', user)
      c.set('userId', user.id)
      c.set('token', token)
      await next()
      return
    }
  }

  c.set('user', null)
  c.set('userId', env.defaultUserId)
  c.set('token', token)
  await next()
})

/** Requires a logged-in account (rejects anonymous default user). */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ ok: false, error: '请先登录', code: 'UNAUTHORIZED' }, 401)
  }
  await next()
})
