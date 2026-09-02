import type { GenerateImageInput, GenerateImageResult } from '@bloomani/shared'
import { assertAgnesConfigured, env } from '../config/env.js'
import { createImage } from '../providers/agnes.js'

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  assertAgnesConfigured()

  const promptParts = [
    input.name ? `角色名：${input.name}` : '',
    input.prompt.trim(),
    'anime character design sheet style, clean lines, consistent face, soft lighting',
    input.negativePrompt ? `避免：${input.negativePrompt}` : '',
  ].filter(Boolean)

  const body: Record<string, unknown> = {
    model: env.imageModel,
    prompt: promptParts.join('。'),
    size: input.size ?? '1K',
    ratio: input.ratio ?? '3:4',
    extra_body: {
      response_format: 'url',
      ...(input.referenceImages?.length
        ? { image: input.referenceImages }
        : {}),
    },
  }

  const result = await createImage(body)
  const first = result.data?.[0]
  if (!first?.url && !first?.b64_json) {
    throw new Error('Agnes image response missing url/b64_json')
  }

  return {
    model: env.imageModel,
    prompt: String(body.prompt),
    url: first.url ?? null,
    b64Json: first.b64_json ?? null,
    revisedPrompt: first.revised_prompt ?? null,
  }
}
