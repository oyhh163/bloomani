/** Generation request/response contracts for Agnes backends */

export type ImageSizeTier = '1K' | '2K' | '3K' | '4K'

export type ImageAspectRatio =
  | '1:1'
  | '3:4'
  | '4:3'
  | '16:9'
  | '9:16'
  | '2:3'
  | '3:2'
  | '21:9'

export interface GenerateImageInput {
  prompt: string
  /** Optional character / style hints appended to prompt */
  name?: string
  size?: ImageSizeTier
  ratio?: ImageAspectRatio
  /** Public URLs or data URIs for image-to-image */
  referenceImages?: string[]
  negativePrompt?: string
}

export interface GenerateImageResult {
  model: string
  prompt: string
  url: string | null
  b64Json: string | null
  revisedPrompt?: string | null
}

export interface CreateVideoInput {
  prompt: string
  /** Public image URL for image-to-video */
  image?: string
  width?: number
  height?: number
  /** Prefer 8n+1; common: 81≈3s, 121≈5s @24fps */
  numFrames?: number
  frameRate?: number
  negativePrompt?: string
}

export type VideoTaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed'

export interface VideoTask {
  taskId: string
  videoId: string
  model: string
  status: VideoTaskStatus
  progress: number
  seconds?: string
  size?: string
  url?: string | null
  error?: string | null
  createdAt?: number
  completedAt?: number
}

export const DEFAULT_IMAGE_MODEL = 'agnes-image-2.5-flash'
export const DEFAULT_VIDEO_MODEL = 'agnes-video-v2.0'
