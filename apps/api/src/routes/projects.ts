import { Hono } from 'hono'
import type { ApiResponse, CreateProjectInput, Project, ProjectBundle } from '@bloomani/shared'
import {
  createProject,
  getProjectBundle,
  listProjects,
} from '../services/director.js'

export const projectRoutes = new Hono()

projectRoutes.get('/', (c) => {
  const body: ApiResponse<Project[]> = { ok: true, data: listProjects() }
  return c.json(body)
})

projectRoutes.post('/', async (c) => {
  const input = (await c.req.json()) as CreateProjectInput
  if (!input?.idea?.trim()) {
    const fail: ApiResponse<never> = { ok: false, error: 'idea is required', code: 'VALIDATION' }
    return c.json(fail, 400)
  }

  const project = createProject(input)
  const body: ApiResponse<Project> = { ok: true, data: project }
  return c.json(body, 201)
})

projectRoutes.get('/:projectId', (c) => {
  const bundle = getProjectBundle(c.req.param('projectId'))
  if (!bundle) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<ProjectBundle> = { ok: true, data: bundle }
  return c.json(body)
})
