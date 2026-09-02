import { eq } from 'drizzle-orm'
import type { StyleProfile } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { styles } from '../db/schema.js'
import { id } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapStyle(row: typeof styles.$inferSelect): StyleProfile {
  return {
    id: row.id,
    kind: 'style',
    name: row.name,
    label: row.label,
    palette: row.palette ?? [],
    lightingMood: row.lightingMood,
    aspectRatio: row.aspectRatio,
    stylePrompt: row.stylePrompt,
    preferredRenderModels: row.preferredRenderModels ?? [],
    libraryScoped: row.libraryScoped,
    projectId: row.projectId ?? undefined,
    tags: row.tags ?? [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

export type UpsertStyleInput = Omit<StyleProfile, 'id' | 'kind' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export async function upsertStylePg(
  partial: UpsertStyleInput,
  userId = env.defaultUserId,
): Promise<StyleProfile> {
  const db = getDb()
  const styleId = partial.id ?? id('style')
  const stamp = new Date()
  const existing = await getStylePg(styleId)

  if (existing) {
    const [row] = await db
      .update(styles)
      .set({
        name: partial.name,
        label: partial.label,
        palette: partial.palette,
        lightingMood: partial.lightingMood,
        aspectRatio: partial.aspectRatio,
        stylePrompt: partial.stylePrompt,
        preferredRenderModels: partial.preferredRenderModels,
        libraryScoped: partial.libraryScoped,
        projectId: partial.projectId,
        tags: partial.tags ?? [],
        updatedAt: stamp,
      })
      .where(eq(styles.id, styleId))
      .returning()
    return mapStyle(row)
  }

  const [row] = await db
    .insert(styles)
    .values({
      id: styleId,
      userId,
      name: partial.name,
      label: partial.label,
      palette: partial.palette,
      lightingMood: partial.lightingMood,
      aspectRatio: partial.aspectRatio,
      stylePrompt: partial.stylePrompt,
      preferredRenderModels: partial.preferredRenderModels,
      libraryScoped: partial.libraryScoped,
      projectId: partial.projectId,
      tags: partial.tags ?? [],
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
  return mapStyle(row)
}

export async function getStylePg(styleId: string): Promise<StyleProfile | undefined> {
  const db = getDb()
  const [row] = await db.select().from(styles).where(eq(styles.id, styleId)).limit(1)
  return row ? mapStyle(row) : undefined
}
