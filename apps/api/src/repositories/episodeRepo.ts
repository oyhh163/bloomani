import { and, asc, eq } from 'drizzle-orm'
import type { Episode, EpisodeScriptBody } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { episodes } from '../db/schema.js'
import { nowIso } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

/** 把可能为 {} 的 scriptBody 规整为合法对象或 undefined */
function normalizeScriptBody(value: EpisodeScriptBody | null | undefined): EpisodeScriptBody | undefined {
  if (!value || !Array.isArray(value.scenes) || value.scenes.length === 0) return undefined
  return value
}

function mapEpisode(row: typeof episodes.$inferSelect): Episode {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    screenplayId: row.screenplayId ?? undefined,
    index: row.index,
    title: row.title,
    synopsis: row.synopsis,
    durationSec: row.durationSec,
    beats: row.beats ?? [],
    scenes: row.scenes ?? [],
    scriptBody: normalizeScriptBody(row.scriptBody),
    shots: row.shots ?? [],
    hookShots: row.hookShots ?? {},
    status: row.status,
    updatedAt: toIso(row.updatedAt),
  }
}

/** 批量 upsert：按 (projectId, index) 覆盖，其余保留 */
export async function saveEpisodesPg(
  list: Episode[],
  userId = env.defaultUserId,
): Promise<Episode[]> {
  if (list.length === 0) return []
  const db = getDb()
  const projectId = list[0].projectId
  const stamp = nowIso()
  const result: Episode[] = []

  const existing = await db
    .select()
    .from(episodes)
    .where(eq(episodes.projectId, projectId))
  const byIndex = new Map(existing.map((row) => [row.index, row]))

  for (const episode of list) {
    const prev = byIndex.get(episode.index)
    const values = {
      userId: prev?.userId ?? userId,
      projectId: episode.projectId,
      screenplayId: episode.screenplayId,
      index: episode.index,
      title: episode.title,
      synopsis: episode.synopsis,
      durationSec: episode.durationSec,
      beats: episode.beats,
      scenes: episode.scenes,
      scriptBody: episode.scriptBody,
      shots: episode.shots,
      hookShots: episode.hookShots,
      status: episode.status,
      updatedAt: stamp,
    }

    if (prev) {
      const [row] = await db
        .update(episodes)
        .set(values)
        .where(eq(episodes.id, prev.id))
        .returning()
      result.push(mapEpisode(row))
    } else {
      const [row] = await db
        .insert(episodes)
        .values({ ...values, id: episode.id })
        .returning()
      result.push(mapEpisode(row))
    }
  }

  return result
}

export async function listEpisodesPg(projectId: string): Promise<Episode[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(episodes)
    .where(eq(episodes.projectId, projectId))
    .orderBy(asc(episodes.index))
  return rows.map(mapEpisode)
}

export async function getEpisodePg(episodeId: string): Promise<Episode | undefined> {
  const db = getDb()
  const [row] = await db.select().from(episodes).where(eq(episodes.id, episodeId)).limit(1)
  return row ? mapEpisode(row) : undefined
}

export async function deleteEpisodesByProjectPg(projectId: string): Promise<number> {
  const db = getDb()
  const deleted = await db
    .delete(episodes)
    .where(and(eq(episodes.projectId, projectId)))
    .returning({ id: episodes.id })
  return deleted.length
}
