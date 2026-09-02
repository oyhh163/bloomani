import type { CreateVideoInput, VideoTask, VideoTaskStatus } from '@bloomani/shared'
import { assertAgnesConfigured, env } from '../config/env.js'
import { createVideo, getVideoById } from '../providers/agnes.js'

function mapStatus(status?: string): VideoTaskStatus {
  if (status === 'completed' || status === 'failed' || status === 'in_progress' || status === 'queued') {
    return status
  }
  return 'queued'
}

export async function startVideoGeneration(input: CreateVideoInput): Promise<VideoTask> {
  assertAgnesConfigured()

  const body: Record<string, unknown> = {
    model: env.videoModel,
    prompt: input.prompt.trim(),
    width: input.width ?? 720,
    height: input.height ?? 1280,
    num_frames: input.numFrames ?? 121,
    frame_rate: input.frameRate ?? 24,
  }

  if (input.image) body.image = input.image
  if (input.negativePrompt) body.negative_prompt = input.negativePrompt

  const result = await createVideo(body)
  const taskId = result.task_id ?? result.id ?? ''
  const videoId = result.video_id ?? taskId

  if (!videoId) {
    throw new Error('Agnes video create response missing video_id')
  }

  return {
    taskId,
    videoId,
    model: result.model ?? env.videoModel,
    status: mapStatus(result.status),
    progress: result.progress ?? 0,
    seconds: result.seconds,
    size: result.size,
    createdAt: result.created_at,
  }
}

export async function pollVideoTask(videoId: string): Promise<VideoTask> {
  assertAgnesConfigured()

  const result = await getVideoById(videoId, env.videoModel)
  const taskId = result.task_id ?? result.id ?? videoId

  return {
    taskId,
    videoId: result.video_id ?? videoId,
    model: result.model ?? env.videoModel,
    status: mapStatus(result.status),
    progress: result.progress ?? 0,
    seconds: result.seconds,
    size: result.size,
    url: result.metadata?.url ?? null,
    error: result.error ? JSON.stringify(result.error) : null,
    createdAt: result.created_at,
    completedAt: result.completed_at,
  }
}
