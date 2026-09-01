import { Hono } from 'hono'
import type { ApiResponse, PipelineJob, StartPipelineInput } from '@bloomani/shared'
import { getJob, listJobs, startPipeline } from '../services/director.js'

export const pipelineRoutes = new Hono()

pipelineRoutes.post('/start', async (c) => {
  const input = (await c.req.json()) as StartPipelineInput
  if (!input?.projectId) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: 'projectId is required',
      code: 'VALIDATION',
    }
    return c.json(fail, 400)
  }

  try {
    const job = startPipeline(input)
    const body: ApiResponse<PipelineJob> = { ok: true, data: job }
    return c.json(body, 202)
  } catch (error) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: error instanceof Error ? error.message : 'failed to start pipeline',
      code: 'PIPELINE_ERROR',
    }
    return c.json(fail, 404)
  }
})

pipelineRoutes.get('/jobs', (c) => {
  const projectId = c.req.query('projectId')
  const body: ApiResponse<PipelineJob[]> = { ok: true, data: listJobs(projectId) }
  return c.json(body)
})

pipelineRoutes.get('/jobs/:jobId', (c) => {
  const job = getJob(c.req.param('jobId'))
  if (!job) {
    const fail: ApiResponse<never> = { ok: false, error: 'job not found', code: 'NOT_FOUND' }
    return c.json(fail, 404)
  }
  const body: ApiResponse<PipelineJob> = { ok: true, data: job }
  return c.json(body)
})
