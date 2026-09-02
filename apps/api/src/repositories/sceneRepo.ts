import { eq } from 'drizzle-orm'
import type { CreateSceneInput, SceneAsset } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { scenes } from '../db/schema.js'
import { id } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapScene(row: typeof scenes.$inferSelect): SceneAsset {
  return {
    id: row.id,
    kind: 'scene',
    name: row.name,
    description: row.description,
    projectId: row.projectId ?? undefined,
    libraryScoped: row.libraryScoped,
    tags: row.tags ?? [],
    environment: row.environment,
    referenceUrls: row.referenceUrls ?? [],
    consistencyPrompt: row.consistencyPrompt,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

export async function createScenePg(
  input: CreateSceneInput,
  userId = env.defaultUserId,
): Promise<SceneAsset> {
  const db = getDb()
  const stamp = new Date()
  const environment = {
    timeOfDay: input.environment?.timeOfDay,
    weather: input.environment?.weather,
    mood: input.environment?.mood,
    lighting: input.environment?.lighting,
    keyProps: input.environment?.keyProps ?? [],
  }
  const [row] = await db
    .insert(scenes)
    .values({
      id: id('scene'),
      userId,
      name: input.name,
      description: input.description,
      libraryScoped: input.libraryScoped ?? true,
      projectId: input.projectId,
      tags: [],
      environment,
      referenceUrls: input.referenceUrls ?? [],
      consistencyPrompt: input.description,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
  return mapScene(row)
}

export async function listScenesPg(projectId?: string): Promise<SceneAsset[]> {
  const db = getDb()
  const rows = await db.select().from(scenes)
  const mapped = rows.map(mapScene)
  if (!projectId) return mapped.filter((s) => s.libraryScoped)
  return mapped.filter((s) => s.projectId === projectId || s.libraryScoped)
}

export async function getScenePg(sceneId: string): Promise<SceneAsset | undefined> {
  const db = getDb()
  const [row] = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1)
  return row ? mapScene(row) : undefined
}
