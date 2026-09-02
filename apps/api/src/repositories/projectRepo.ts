import { desc, eq } from 'drizzle-orm'
import type { CreateProjectInput, Project } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { projectCharacters, projects } from '../db/schema.js'
import { id } from '../store/memory.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    title: row.title,
    idea: row.idea,
    status: row.status,
    mode: row.mode as Project['mode'],
    aspectRatio: row.aspectRatio,
    language: row.language,
    styleId: row.styleId ?? undefined,
    characterIds: row.characterIds ?? [],
    sceneIds: row.sceneIds ?? [],
    screenplayId: row.screenplayId ?? undefined,
    timelineId: row.timelineId ?? undefined,
    outputUrl: row.outputUrl ?? undefined,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function deriveTitle(idea: string): string {
  const trimmed = idea.trim()
  return trimmed.length <= 24 ? trimmed || '未命名项目' : `${trimmed.slice(0, 24)}…`
}

async function syncProjectCharacters(projectId: string, characterIds: string[]): Promise<void> {
  const db = getDb()
  await db.delete(projectCharacters).where(eq(projectCharacters.projectId, projectId))
  if (characterIds.length === 0) return
  await db.insert(projectCharacters).values(
    characterIds.map((characterId, sortOrder) => ({
      projectId,
      characterId,
      sortOrder,
    })),
  )
}

export async function createProjectPg(
  input: CreateProjectInput,
  userId = env.defaultUserId,
): Promise<Project> {
  const db = getDb()
  const stamp = new Date()
  const characterIds = input.characterIds ?? []
  const projectId = id('proj')
  const [row] = await db
    .insert(projects)
    .values({
      id: projectId,
      userId,
      title: input.title?.trim() || deriveTitle(input.idea),
      idea: input.idea.trim(),
      status: 'draft',
      mode: input.mode ?? 'hosted',
      aspectRatio: input.aspectRatio ?? '9:16',
      language: input.language ?? 'zh-CN',
      characterIds,
      sceneIds: [],
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()

  await syncProjectCharacters(projectId, characterIds)
  return mapProject(row)
}

export async function listProjectsPg(userId = env.defaultUserId): Promise<Project[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))
  return rows.map(mapProject)
}

export async function getProjectPg(projectId: string): Promise<Project | undefined> {
  const db = getDb()
  const [row] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  return row ? mapProject(row) : undefined
}

export async function saveProjectPg(project: Project): Promise<Project> {
  const db = getDb()
  const stamp = new Date(project.updatedAt)
  const [row] = await db
    .update(projects)
    .set({
      title: project.title,
      idea: project.idea,
      status: project.status,
      mode: project.mode,
      aspectRatio: project.aspectRatio,
      language: project.language,
      styleId: project.styleId,
      characterIds: project.characterIds,
      sceneIds: project.sceneIds,
      screenplayId: project.screenplayId,
      timelineId: project.timelineId,
      outputUrl: project.outputUrl,
      updatedAt: stamp,
    })
    .where(eq(projects.id, project.id))
    .returning()

  await syncProjectCharacters(project.id, project.characterIds)
  return mapProject(row)
}
