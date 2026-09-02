import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env.js'
import * as schema from './schema.js'

let client: ReturnType<typeof postgres> | null = null
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!dbInstance) {
    client = postgres(env.databaseUrl, { max: 10 })
    dbInstance = drizzle(client, { schema })
  }
  return dbInstance
}

export async function checkDbHealth(): Promise<'up' | 'down'> {
  if (env.storageDriver !== 'postgres' || !env.databaseUrl) {
    return env.storageDriver === 'memory' ? 'up' : 'down'
  }
  try {
    const sql = postgres(env.databaseUrl, { max: 1 })
    await sql`select 1`
    await sql.end({ timeout: 2 })
    return 'up'
  } catch {
    return 'down'
  }
}

export async function ensureLocalUser(): Promise<void> {
  if (env.storageDriver !== 'postgres') return
  const db = getDb()
  await db
    .insert(schema.users)
    .values({
      id: env.defaultUserId,
      displayName: 'Local Creator',
    })
    .onConflictDoNothing()
}
