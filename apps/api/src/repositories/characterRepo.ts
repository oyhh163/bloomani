import { and, asc, eq } from 'drizzle-orm'
import type { CharacterAsset, CreateCharacterInput } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { characterSheets, characters, projectCharacters, projects } from '../db/schema.js'
import { id, nowIso } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

export async function createCharacterPg(
  input: CreateCharacterInput,
  userId = env.defaultUserId,
): Promise<CharacterAsset> {
  const db = getDb()
  const characterId = id('char')
  const stamp = nowIso()
  const visualLock = {
    face: `derived from: ${input.description}`,
    hair: 'pending lock',
    outfit: 'pending lock',
    proportions: 'pending lock',
    accessories: [] as string[],
    identityPrompt: input.description,
  }
  const identityMemory = {
    embeddingId: id('emb'),
    model: 'identity-encoder-stub',
    dimensions: 768,
  }
  const refs = input.referenceUrls ?? []

  await db.insert(characters).values({
    id: characterId,
    userId,
    name: input.name,
    bio: input.bio,
    personality: input.personality,
    libraryScoped: input.libraryScoped ?? true,
    projectId: input.projectId,
    styleId: input.styleId,
    tags: [],
    visualLock,
    identityMemory,
    createdAt: stamp,
    updatedAt: stamp,
  })

  if (refs.length > 0) {
    await db.insert(characterSheets).values(
      refs.map((url, index) => ({
        id: id('sheet'),
        characterId,
        view: index === 0 ? 'front' : 'three_quarter',
        url,
        sortOrder: index,
      })),
    )
  }

  if (input.projectId) {
    await linkCharacterToProject(input.projectId, characterId)
  }

  const sheetViews: CharacterAsset['sheets'] =
    input.sheets && input.sheets.length > 0
      ? input.sheets
      : refs.map((url, index) => ({
          view: (index === 0 ? 'front' : 'three_quarter') as 'front' | 'three_quarter',
          url,
        }))

  return {
    id: characterId,
    kind: 'character',
    name: input.name,
    bio: input.bio,
    personality: input.personality,
    tagline: input.tagline,
    projectId: input.projectId,
    libraryScoped: input.libraryScoped ?? true,
    tags: [],
    styleId: input.styleId,
    styleSnapshot: input.styleSnapshot,
    visualLock,
    sheets: sheetViews,
    turnaround: input.turnaround,
    identityMemory,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export async function listLibraryCharactersPg(
  userId = env.defaultUserId,
): Promise<CharacterAsset[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(characters)
    .where(and(eq(characters.libraryScoped, true), eq(characters.userId, userId)))
  const result: CharacterAsset[] = []
  for (const row of rows) {
    result.push(await hydrateCharacter(row))
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getCharacterPg(characterId: string): Promise<CharacterAsset | undefined> {
  const db = getDb()
  const [row] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1)
  if (!row) return undefined
  return hydrateCharacter(row)
}

export async function deleteCharacterPg(characterId: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db.delete(characters).where(eq(characters.id, characterId)).returning({
    id: characters.id,
  })
  return deleted.length > 0
}

/**
 * 把生成出来的三视图 + 风格快照持久化到角色记录。
 * 同时把 turnaround.slots 中的 url 同步进 characterSheets 表，便于其它模块继续消费。
 */
export async function updateCharacterTurnaroundPg(
  characterId: string,
  payload: {
    turnaround?: CharacterAsset['turnaround']
    styleSnapshot?: CharacterAsset['styleSnapshot']
    styleId?: string
    tagline?: string
  },
): Promise<CharacterAsset | undefined> {
  const db = getDb()
  const update: Record<string, unknown> = { updatedAt: nowIso() }
  if (payload.turnaround) update.turnaround = payload.turnaround
  if (payload.styleSnapshot) update.styleSnapshot = payload.styleSnapshot
  if (payload.styleId !== undefined) update.styleId = payload.styleId
  if (payload.tagline !== undefined) update.tagline = payload.tagline

  await db.update(characters).set(update).where(eq(characters.id, characterId))

  if (payload.turnaround?.slots?.length) {
    // 用 turnaround 里的 view 覆盖写入 characterSheets
    await db.delete(characterSheets).where(eq(characterSheets.characterId, characterId))
    await db.insert(characterSheets).values(
      payload.turnaround.slots
        .filter((slot) => !!slot.url)
        .map((slot, index) => ({
          id: id('sheet'),
          characterId,
          view: slot.view,
          url: slot.url as string,
          expression: slot.id,
          sortOrder: index,
        })),
    )
  }

  return getCharacterPg(characterId)
}

async function linkCharacterToProject(projectId: string, characterId: string): Promise<void> {
  const db = getDb()
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) return

  const nextIds = project.characterIds?.includes(characterId)
    ? project.characterIds
    : [...(project.characterIds ?? []), characterId]

  await db
    .update(projects)
    .set({ characterIds: nextIds, updatedAt: nowIso() })
    .where(eq(projects.id, projectId))

  await db
    .insert(projectCharacters)
    .values({
      projectId,
      characterId,
      sortOrder: nextIds.indexOf(characterId),
    })
    .onConflictDoNothing()
}

async function hydrateCharacter(
  row: typeof characters.$inferSelect,
): Promise<CharacterAsset> {
  const db = getDb()
  const sheets = await db
    .select()
    .from(characterSheets)
    .where(eq(characterSheets.characterId, row.id))
    .orderBy(asc(characterSheets.sortOrder))

  return {
    id: row.id,
    kind: 'character',
    name: row.name,
    bio: row.bio ?? undefined,
    personality: row.personality ?? undefined,
    tagline: (row as { tagline?: string }).tagline ?? undefined,
    projectId: row.projectId ?? undefined,
    libraryScoped: row.libraryScoped,
    tags: row.tags ?? [],
    styleId: row.styleId ?? undefined,
    styleSnapshot: (row as { styleSnapshot?: CharacterAsset['styleSnapshot'] }).styleSnapshot ?? undefined,
    visualLock: row.visualLock,
    sheets: sheets.map((s) => ({
      view: s.view as CharacterAsset['sheets'][number]['view'],
      expression: s.expression ?? undefined,
      url: s.url,
    })),
    turnaround: (row as { turnaround?: CharacterAsset['turnaround'] }).turnaround ?? undefined,
    identityMemory: row.identityMemory ?? undefined,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}
