import type { Project } from '@bloomani/shared'
import { env } from '../config/env.js'
import { getProjectPg, saveProjectPg } from '../repositories/projectRepo.js'
import { db } from '../store/memory.js'

/**
 * Project load/persist 双驱动封装。
 * 新服务统一走这里，避免与 director 内部实现相互 import。
 *
 * Postgres: always re-read from DB. A sticky in-memory cache was wiping
 * characterIds / productionMeta when later saves used a stale snapshot
 * (e.g. character link updated PG, but from-script still held empty ids).
 */
export async function loadProject(projectId: string): Promise<Project | undefined> {
  if (env.storageDriver === 'postgres') {
    const project = await getProjectPg(projectId)
    if (project) db.projects.set(project.id, project)
    return project
  }
  return db.projects.get(projectId)
}

export async function persistProject(project: Project): Promise<Project> {
  if (env.storageDriver === 'postgres') {
    const saved = await saveProjectPg(project)
    db.projects.set(saved.id, saved)
    return saved
  }
  db.projects.set(project.id, project)
  return project
}
