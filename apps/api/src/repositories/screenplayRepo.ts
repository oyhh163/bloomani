import { eq } from 'drizzle-orm'
import type { Screenplay } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { screenplays } from '../db/schema.js'
import { id } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapScreenplay(row: typeof screenplays.$inferSelect): Screenplay {
  return {
    id: row.id,
    projectId: row.projectId ?? '',
    logline: row.logline,
    synopsis: row.synopsis,
    targetDurationSec: row.targetDurationSec,
    beats: row.beats ?? [],
    scenes: row.scenes ?? [],
    shots: row.shots ?? [],
    rawScript: row.rawScript ?? undefined,
    updatedAt: toIso(row.updatedAt),
  }
}

export async function saveScreenplayPg(
  screenplay: Screenplay,
  userId = env.defaultUserId,
): Promise<Screenplay> {
  const db = getDb()
  const stamp = new Date(screenplay.updatedAt)
  const existing = await getScreenplayPg(screenplay.id)

  if (existing) {
    const [row] = await db
      .update(screenplays)
      .set({
        projectId: screenplay.projectId,
        logline: screenplay.logline,
        synopsis: screenplay.synopsis,
        targetDurationSec: screenplay.targetDurationSec,
        beats: screenplay.beats,
        scenes: screenplay.scenes,
        shots: screenplay.shots,
        rawScript: screenplay.rawScript,
        updatedAt: stamp,
      })
      .where(eq(screenplays.id, screenplay.id))
      .returning()
    return mapScreenplay(row)
  }

  const [row] = await db
    .insert(screenplays)
    .values({
      id: screenplay.id || id('sp'),
      userId,
      projectId: screenplay.projectId,
      logline: screenplay.logline,
      synopsis: screenplay.synopsis,
      targetDurationSec: screenplay.targetDurationSec,
      beats: screenplay.beats,
      scenes: screenplay.scenes,
      shots: screenplay.shots,
      rawScript: screenplay.rawScript,
      updatedAt: stamp,
    })
    .returning()
  return mapScreenplay(row)
}

export async function getScreenplayPg(screenplayId: string): Promise<Screenplay | undefined> {
  const db = getDb()
  const [row] = await db.select().from(screenplays).where(eq(screenplays.id, screenplayId)).limit(1)
  return row ? mapScreenplay(row) : undefined
}
