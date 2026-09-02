import { Hono } from 'hono'
import type { Context } from 'hono'
import type {
  ApiResponse,
  CreateVideoInput,
  GenerateImageInput,
  GenerateImageResult,
  VideoTask,
} from '@bloomani/shared'
import { env } from '../config/env.js'
import { AgnesApiError } from '../providers/agnes.js'
import { generateImage } from '../services/imageService.js'
import { pollVideoTask, startVideoGeneration } from '../services/videoService.js'

export const generateRoutes = new Hono()

generateRoutes.get('/status', (c) => {
  const body: ApiResponse<{
    configured: boolean
    imageModel: string
    videoModel: string
    baseUrl: string
  }> = {
    ok: true,
    data: {
      configured: Boolean(env.agnesApiKey),
      imageModel: env.imageModel,
      videoModel: env.videoModel,
      baseUrl: env.agnesV1,
    },
  }
  return c.json(body)
})

generateRoutes.post('/image', async (c) => {
  try {
    const input = (await c.req.json()) as GenerateImageInput
    if (!input?.prompt?.trim()) {
      const fail: ApiResponse<never> = {
        ok: false,
        error: 'prompt is required',
        code: 'VALIDATION',
      }
      return c.json(fail, 400)
    }

    const data = await generateImage(input)
    const body: ApiResponse<GenerateImageResult> = { ok: true, data }
    return c.json(body)
  } catch (error) {
    return handleGenerateError(c, error)
  }
})

generateRoutes.post('/video', async (c) => {
  try {
    const input = (await c.req.json()) as CreateVideoInput
    if (!input?.prompt?.trim()) {
      const fail: ApiResponse<never> = {
        ok: false,
        error: 'prompt is required',
        code: 'VALIDATION',
      }
      return c.json(fail, 400)
    }

    const data = await startVideoGeneration(input)
    const body: ApiResponse<VideoTask> = { ok: true, data }
    return c.json(body, 202)
  } catch (error) {
    return handleGenerateError(c, error)
  }
})

generateRoutes.get('/video/:videoId', async (c) => {
  try {
    const data = await pollVideoTask(c.req.param('videoId'))
    const body: ApiResponse<VideoTask> = { ok: true, data }
    return c.json(body)
  } catch (error) {
    return handleGenerateError(c, error)
  }
})

function handleGenerateError(c: Context, error: unknown) {
  if (error instanceof AgnesApiError) {
    const fail: ApiResponse<never> = {
      ok: false,
      error: error.message,
      code: 'AGNES_API',
    }
    const status = error.status >= 400 && error.status < 600 ? error.status : 502
    return c.json(fail, status as 400 | 401 | 404 | 500 | 502 | 503)
  }

  const message = error instanceof Error ? error.message : 'generation failed'
  const fail: ApiResponse<never> = {
    ok: false,
    error: message,
    code: message.includes('AGNES_API_KEY') ? 'CONFIG' : 'GENERATE_ERROR',
  }
  return c.json(fail, message.includes('AGNES_API_KEY') ? 503 : 500)
}
