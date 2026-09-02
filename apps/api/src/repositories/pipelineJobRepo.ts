import { desc, eq } from 'drizzle-orm'
import type { PipelineJob } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getDb } from '../db/client.js'
import { pipelineJobs } from '../db/schema.js'

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapJob(row: typeof pipelineJobs.$inferSelect): PipelineJob {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    currentStage: row.currentStage ?? undefined,
    stages: row.stages ?? [],
    events: row.events ?? [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    error: row.error ?? undefined,
  }
}

export async function savePipelineJobPg(
  job: PipelineJob,
  userId = env.defaultUserId,
): Promise<PipelineJob> {
  const db = getDb()
  const stamp = new Date(job.updatedAt)
  const existing = await getPipelineJobPg(job.id)

  if (existing) {
    const [row] = await db
      .update(pipelineJobs)
      .set({
        status: job.status,
        currentStage: job.currentStage,
        stages: job.stages,
        events: job.events,
        error: job.error,
        updatedAt: stamp,
      })
      .where(eq(pipelineJobs.id, job.id))
      .returning()
    return mapJob(row)
  }

  const [row] = await db
    .insert(pipelineJobs)
    .values({
      id: job.id,
      userId,
      projectId: job.projectId,
      status: job.status,
      currentStage: job.currentStage,
      stages: job.stages,
      events: job.events,
      error: job.error,
      createdAt: new Date(job.createdAt),
      updatedAt: stamp,
    })
    .returning()
  return mapJob(row)
}

export async function getPipelineJobPg(jobId: string): Promise<PipelineJob | undefined> {
  const db = getDb()
  const [row] = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId)).limit(1)
  return row ? mapJob(row) : undefined
}

export async function listPipelineJobsPg(projectId?: string): Promise<PipelineJob[]> {
  const db = getDb()
  const rows = projectId
    ? await db
        .select()
        .from(pipelineJobs)
        .where(eq(pipelineJobs.projectId, projectId))
        .orderBy(desc(pipelineJobs.updatedAt))
    : await db.select().from(pipelineJobs).orderBy(desc(pipelineJobs.updatedAt))
  return rows.map(mapJob)
}
