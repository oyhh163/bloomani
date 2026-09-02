import { env } from '../config/env.js'

export class AgnesApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'AgnesApiError'
    this.status = status
    this.body = body
  }
}

async function agnesFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.agnesApiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? JSON.stringify((body as { error: unknown }).error)
        : `Agnes API ${response.status}: ${text.slice(0, 300)}`
    throw new AgnesApiError(message, response.status, body)
  }

  return body as T
}

export interface AgnesImageResponse {
  created?: number
  data?: Array<{
    url?: string | null
    b64_json?: string | null
    revised_prompt?: string | null
  }>
}

export interface AgnesVideoCreateResponse {
  id?: string
  task_id?: string
  video_id?: string
  model?: string
  status?: string
  progress?: number
  created_at?: number
  seconds?: string
  size?: string
  error?: unknown
}

export interface AgnesVideoResultResponse extends AgnesVideoCreateResponse {
  completed_at?: number
  metadata?: {
    url?: string
    size_mapping?: Record<string, unknown>
  }
}

export function createImage(body: Record<string, unknown>) {
  return agnesFetch<AgnesImageResponse>(`${env.agnesV1}/images/generations`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createVideo(body: Record<string, unknown>) {
  return agnesFetch<AgnesVideoCreateResponse>(`${env.agnesV1}/videos`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getVideoById(videoId: string, modelName?: string) {
  const params = new URLSearchParams({ video_id: videoId })
  if (modelName) params.set('model_name', modelName)
  // Poll endpoint is on host root, not under /v1
  return agnesFetch<AgnesVideoResultResponse>(`${env.agnesOrigin}/agnesapi?${params.toString()}`)
}

/** Legacy OpenAI-style poll by task id */
export function getVideoByTaskId(taskId: string) {
  return agnesFetch<AgnesVideoResultResponse>(`${env.agnesV1}/videos/${taskId}`)
}
