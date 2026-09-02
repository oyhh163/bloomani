import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
// apps/api/.env then repo root .env
loadEnv({ path: resolve(here, '../../.env') })
loadEnv({ path: resolve(here, '../../../../.env') })

/** Accept either https://host or https://host/v1 */
function normalizeAgnesBase(raw: string): { origin: string; v1: string } {
  const trimmed = raw.replace(/\/$/, '')
  if (trimmed.endsWith('/v1')) {
    return { origin: trimmed.slice(0, -3), v1: trimmed }
  }
  return { origin: trimmed, v1: `${trimmed}/v1` }
}

const bases = normalizeAgnesBase(process.env.AGNES_BASE_URL ?? 'https://api.agnes-ai.cn/v1')

export type StorageDriver = 'memory' | 'postgres'

export const env = {
  port: Number(process.env.PORT ?? 3001),
  agnesApiKey: process.env.AGNES_API_KEY ?? '',
  /** Host without /v1 — used for /agnesapi poll */
  agnesOrigin: bases.origin,
  /** OpenAI-compatible root ending with /v1 */
  agnesV1: bases.v1,
  imageModel: process.env.AGNES_IMAGE_MODEL ?? 'agnes-image-2.5-flash',
  videoModel: process.env.AGNES_VIDEO_MODEL ?? 'agnes-video-v2.0',
  databaseUrl: process.env.DATABASE_URL ?? '',
  storageDriver: (process.env.STORAGE_DRIVER ?? 'postgres') as StorageDriver,
  defaultUserId: process.env.DEFAULT_USER_ID ?? 'local',
}

export function assertAgnesConfigured(): void {
  if (!env.agnesApiKey) {
    throw new Error('AGNES_API_KEY is not set. Copy apps/api/.env.example to apps/api/.env')
  }
}

export function assertDbConfigured(): void {
  if (env.storageDriver === 'postgres' && !env.databaseUrl) {
    throw new Error('DATABASE_URL is required when STORAGE_DRIVER=postgres')
  }
}
