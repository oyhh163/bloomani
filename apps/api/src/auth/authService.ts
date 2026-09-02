import { and, eq, gt } from 'drizzle-orm'
import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@bloomani/shared'
import { getDb } from '../db/client.js'
import { sessions, users } from '../db/schema.js'
import { id } from '../store/memory.js'
import { createSessionToken, hashPassword, verifyPassword } from './password.js'

const SESSION_DAYS = 30

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    username: row.username ?? row.id,
    displayName: row.displayName,
    createdAt: toIso(row.createdAt),
  }
}

function sessionExpiry(): Date {
  const expires = new Date()
  expires.setDate(expires.getDate() + SESSION_DAYS)
  return expires
}

export async function registerUser(input: RegisterInput): Promise<AuthSession> {
  const username = input.username.trim().toLowerCase()
  const password = input.password
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    throw Object.assign(new Error('用户名需为 3–32 位字母、数字或下划线'), { code: 'VALIDATION' })
  }
  if (password.length < 6) {
    throw Object.assign(new Error('密码至少 6 位'), { code: 'VALIDATION' })
  }

  const db = getDb()
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (existing.length > 0) {
    throw Object.assign(new Error('用户名已被占用'), { code: 'CONFLICT' })
  }

  const userId = id('user')
  const stamp = new Date()
  const [row] = await db
    .insert(users)
    .values({
      id: userId,
      username,
      passwordHash: hashPassword(password),
      displayName: input.displayName?.trim() || username,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()

  return createSessionForUser(mapUser(row))
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  const username = input.username.trim().toLowerCase()
  const db = getDb()
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (!row?.passwordHash || !verifyPassword(input.password, row.passwordHash)) {
    throw Object.assign(new Error('用户名或密码错误'), { code: 'UNAUTHORIZED' })
  }
  return createSessionForUser(mapUser(row))
}

async function createSessionForUser(user: AuthUser): Promise<AuthSession> {
  const db = getDb()
  const token = createSessionToken()
  const expiresAt = sessionExpiry()
  await db.insert(sessions).values({
    token,
    userId: user.id,
    expiresAt,
  })
  return {
    token,
    user,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function logoutSession(token: string): Promise<void> {
  const db = getDb()
  await db.delete(sessions).where(eq(sessions.token, token))
}

export async function resolveSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const db = getDb()
  const now = new Date()
  const [row] = await db
    .select({
      user: users,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1)

  if (!row) return null
  return mapUser(row.user)
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const db = getDb()
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return row ? mapUser(row) : null
}
