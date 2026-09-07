import { CHARACTER_STYLE_PRESETS, type CharacterStylePreset } from '@bloomani/shared'
import { Hono } from 'hono'
import type { AuthVariables } from '../auth/middleware.js'
import { assertAgnesConfigured, env } from '../config/env.js'
import {
  createCharacter,
  getCharacter,
  updateCharacterTurnaround,
} from '../services/assetMemory.js'
import { generateCharacterTurnaround } from '../services/characterTurnaroundService.js'

export const characterStudioRoutes = new Hono<{ Variables: AuthVariables }>()

/** 风格预设列表（前端初始化时拉取） */
characterStudioRoutes.get('/styles', (c) => {
  return c.json({
    ok: true,
    data: CHARACTER_STYLE_PRESETS.map((preset: CharacterStylePreset) => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      palette: preset.palette,
      lightingMood: preset.lightingMood,
    })),
  })
})

interface CreateAndTurnaroundBody {
  name: string
  bio?: string
  personality?: string
  tagline?: string
  description: string
  stylePresetId?: string
  styleId?: string
  referenceUrls?: string[]
  projectId?: string
  libraryScoped?: boolean
}

/**
 * 一步：创建角色 + 生成四视图，并把 turnaround / styleSnapshot 持久化。
 */
characterStudioRoutes.post('/turnaround', async (c) => {
  if (!env.agnesApiKey) return c.json({ ok: false, error: 'AGNES_API_KEY 未配置' }, 500)
  try {
    assertAgnesConfigured()
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 400)
  }

  const body = (await c.req.json()) as CreateAndTurnaroundBody
  if (!body?.name?.trim() || !body?.description?.trim()) {
    return c.json({ ok: false, error: '缺少 name 或 description' }, 400)
  }

  const userId = c.get('user')?.id
  const created = await createCharacter(
    {
      name: body.name,
      bio: body.bio,
      personality: body.personality,
      tagline: body.tagline,
      description: body.description,
      referenceUrls: body.referenceUrls ?? [],
      styleId: body.styleId,
      projectId: body.projectId,
      libraryScoped: body.libraryScoped,
    },
    userId,
  )

  const turnaround = await generateCharacterTurnaround({
    character: created,
    stylePresetId: body.stylePresetId,
    styleId: body.styleId,
    tagline: body.tagline,
  })

  const styleSnapshot = created.styleSnapshot ?? {
    label: '未指定风格',
    palette: [],
    stylePrompt: '',
  }

  const final = await updateCharacterTurnaround(created.id, {
    turnaround,
    styleSnapshot,
    styleId: body.styleId,
    tagline: body.tagline ?? created.tagline,
  })

  return c.json({ ok: true, data: final ?? created })
})

interface RegenerateBody {
  characterId: string
  stylePresetId?: string
  styleId?: string
  tagline?: string
  /** 仅重生部分槽位，默认全部 */
  slotIds?: string[]
  /** 传入已有头像作为种子，强制 I2I 锁定 */
  seedReferenceUrl?: string
}

/** 重生单角色三视图（部分或全部） */
characterStudioRoutes.post('/turnaround/regenerate', async (c) => {
  if (!env.agnesApiKey) return c.json({ ok: false, error: 'AGNES_API_KEY 未配置' }, 500)

  const body = (await c.req.json()) as RegenerateBody
  if (!body?.characterId) return c.json({ ok: false, error: '缺少 characterId' }, 400)

  const existing = await getCharacter(body.characterId)
  if (!existing) return c.json({ ok: false, error: '角色不存在' }, 404)

  const slots = existing.turnaround?.slots
    ? body.slotIds
      ? existing.turnaround.slots.filter((s) => body.slotIds?.includes(s.id))
      : existing.turnaround.slots
    : undefined

  const next = await generateCharacterTurnaround({
    character: existing,
    stylePresetId: body.stylePresetId,
    styleId: body.styleId,
    tagline: body.tagline,
    slots,
    seedReferenceUrl: body.seedReferenceUrl,
  })

  const merged: typeof next = {
    ...next,
    slots:
      existing.turnaround?.slots?.map((prev) => {
        const replaced = next.slots.find((s) => s.id === prev.id)
        return replaced ?? prev
      }) ?? next.slots,
  }

  const updated = await updateCharacterTurnaround(existing.id, {
    turnaround: merged,
    tagline: body.tagline ?? existing.tagline,
  })

  return c.json({ ok: true, data: updated ?? existing })
})