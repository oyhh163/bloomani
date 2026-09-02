import { Hono } from 'hono'
import type { ApiResponse, CreateProjectInput, Project, ProjectBundle } from '@bloomani/shared'
import type { AuthVariables } from '../auth/middleware.js'
import { requireAuth } from '../auth/middleware.js'
import {
  createProject,
  getProjectBundle,
  listProjects,
} from '../services/director.js'

export const projectRoutes = new Hono<{ Variables: AuthVariables }>()

projectRoutes.get('/', requireAuth, async (c) => {
  const body: ApiResponse<Project[]> = {
    ok: true,
    data: await listProjects(c.get('userId')),
  }
  return c.json(body)
})

projectRoutes.post('/', requireAuth, async (c) => {
  const input = (await c.req.json()) as CreateProjectInput
  if (!input?.idea?.trim()) {
    const fail: ApiResponse<never> = { ok: false, error: 'idea is required', code: 'VALIDATION' }
    return c.json(fail, 400)
  }

  const project = await createProject(input, c.get('userId'))
  const body: ApiResponse<Project> = { ok: true, data: project }
  return c.json(body, 201)
})

projectRoutes.get('/:projectId', requireAuth, async (c) => {
  const bundle = await getProjectBundle(c.req.param('projectId'))
  if (!bundle) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<ProjectBundle> = { ok: true, data: bundle }
  return c.json(body)
})
