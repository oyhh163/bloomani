import { eq } from 'drizzle-orm'
import type { Timeline } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { timelines } from '../db/schema.js'
import { id } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapTimeline(row: typeof timelines.$inferSelect): Timeline {
  return {
    id: row.id,
    projectId: row.projectId,
    clips: row.clips ?? [],
    audio: row.audio ?? [],
    durationSec: row.durationSec,
    updatedAt: toIso(row.updatedAt),
  }
}

export async function saveTimelinePg(
  timeline: Timeline,
  userId = env.defaultUserId,
): Promise<Timeline> {
  const db = getDb()
  const stamp = new Date(timeline.updatedAt)
  const existing = await getTimelinePg(timeline.id)

  if (existing) {
    const [row] = await db
      .update(timelines)
      .set({
        clips: timeline.clips,
        audio: timeline.audio,
        durationSec: timeline.durationSec,
        updatedAt: stamp,
      })
      .where(eq(timelines.id, timeline.id))
      .returning()
    return mapTimeline(row)
  }

  const [row] = await db
    .insert(timelines)
    .values({
      id: timeline.id || id('tl'),
      userId,
      projectId: timeline.projectId,
      clips: timeline.clips,
      audio: timeline.audio,
      durationSec: timeline.durationSec,
      updatedAt: stamp,
    })
    .returning()
  return mapTimeline(row)
}

export async function getTimelinePg(timelineId: string): Promise<Timeline | undefined> {
  const db = getDb()
  const [row] = await db.select().from(timelines).where(eq(timelines.id, timelineId)).limit(1)
  return row ? mapTimeline(row) : undefined
}

export async function getTimelineByProjectPg(projectId: string): Promise<Timeline | undefined> {
  const db = getDb()
  const [row] = await db.select().from(timelines).where(eq(timelines.projectId, projectId)).limit(1)
  return row ? mapTimeline(row) : undefined
}
