import { Hono } from 'hono'
import type {
  ApiResponse,
  CreateFromIdeaInput,
  ImportScriptInput,
  Screenplay,
} from '@bloomani/shared'
import { getProject } from '../services/director.js'
import {
  buildScreenplayFromIdea,
  buildScreenplayFromScript,
  getScreenplay,
} from '../services/screenplayService.js'
import { nowIso } from '../store/memory.js'

export const screenplayRoutes = new Hono()

screenplayRoutes.post('/from-idea', async (c) => {
  const input = (await c.req.json()) as CreateFromIdeaInput & { projectId: string }
  if (!input?.projectId || !input?.idea?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'projectId and idea are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const project = getProject(input.projectId)
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }

  const screenplay = buildScreenplayFromIdea(project.id, input)
  project.screenplayId = screenplay.id
  project.updatedAt = nowIso()

  const body: ApiResponse<Screenplay> = { ok: true, data: screenplay }
  return c.json(body, 201)
})

screenplayRoutes.post('/from-script', async (c) => {
  const input = (await c.req.json()) as ImportScriptInput & { projectId: string }
  if (!input?.projectId || !input?.script?.trim()) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'projectId and script are required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  const project = getProject(input.projectId)
  if (!project) {
    const fail: ApiResponse<never> = { ok: false, error: 'project not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }

  const screenplay = buildScreenplayFromScript(project.id, input)
  project.screenplayId = screenplay.id
  project.updatedAt = nowIso()

  const body: ApiResponse<Screenplay> = { ok: true, data: screenplay }
  return c.json(body, 201)
})

screenplayRoutes.get('/:screenplayId', (c) => {
  const screenplay = getScreenplay(c.req.param('screenplayId'))
  if (!screenplay) {
    const fail: ApiResponse<never> = { ok: false, error: 'screenplay not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<Screenplay> = { ok: true, data: screenplay }
  return c.json(body)
})
