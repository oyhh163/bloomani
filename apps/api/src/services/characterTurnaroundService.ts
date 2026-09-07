import type {
  CharacterAsset,
  CharacterTurnaround,
  CharacterTurnaroundSlot,
  StyleProfile,
} from '@bloomani/shared'
import {
  CHARACTER_STYLE_PRESETS,
  DEFAULT_TURNAROUND_SLOTS,
  buildTurnaroundPrompt,
  toAgnesTurnaroundPayload,
} from '@bloomani/shared'
import { env } from '../config/env.js'
import { createImage } from '../providers/agnes.js'
import { getStyle } from './assetMemory.js'

export interface GenerateTurnaroundInput {
  character: CharacterAsset
  /** 来自前端的风格选择 id */
  stylePresetId?: string
  /** 已在数据库中的 StyleProfile (优先使用) */
  styleId?: string
  /** 营销短句（可选） */
  tagline?: string
  /** 需要生成的槽位 (默认四视图) */
  slots?: CharacterTurnaroundSlot[]
  /** 重用已生成的头像作为参考图 (I2I 锁定一致性) */
  seedReferenceUrl?: string
}

/**
 * 根据风格 + 角色身份一次性生成四张（头、正、背、侧）定妆照。
 *
 * 设计要点：
 *  - 头部先出，作为后续正面 / 背面 / 侧面的参考图，强制 I2I 锁定形象。
 *  - 全部失败回退为本地占位图，避免页面空白。
 *  - 风格解析顺序：styleId 关联的 StyleProfile > CHARACTER_STYLE_PRESETS 中匹配 > styleSnapshot > 不传。
 */
export async function generateCharacterTurnaround(
  input: GenerateTurnaroundInput,
): Promise<CharacterTurnaround> {
  const slots = input.slots?.length ? input.slots : DEFAULT_TURNAROUND_SLOTS

  const style = await resolveStyleProfile(input)
  const identity = buildIdentityText(input.character)
  const styleSnapshot = style
    ? {
        id: style.id,
        label: style.label ?? style.name ?? '风格',
        palette: style.palette ?? [],
        stylePrompt: style.stylePrompt ?? '',
      }
    : input.character.styleSnapshot

  const generatedSlots: CharacterTurnaroundSlot[] = []
  let lastReference: string | undefined = input.seedReferenceUrl ?? pickExistingUrl(input.character)

  for (const slot of slots) {
    const prompt = buildTurnaroundPrompt({
      identity,
      style,
      styleSnapshot,
      tagline: input.tagline ?? input.character.tagline,
      slot,
      referenceImages: lastReference ? [lastReference] : undefined,
    })

    const payload = toAgnesTurnaroundPayload(prompt, {
      model: env.imageModel,
      slot,
      referenceImages: lastReference ? [lastReference] : undefined,
    })

    const next: CharacterTurnaroundSlot = { ...slot, status: 'generating' }
    try {
      const url = await createImage(payload)
      next.url = url
      next.status = 'idle'
      // 把头像 / 全身图作为后续视角的参考，强制 I2I 锁定
      lastReference = url
    } catch (err) {
      next.status = 'failed'
      next.url = pickPlaceholder(slot, input.character, style)
    }
    generatedSlots.push(next)
  }

  return {
    generatedAt: new Date().toISOString(),
    slots: generatedSlots,
  }
}

async function resolveStyleProfile(input: GenerateTurnaroundInput): Promise<StyleProfile | undefined> {
  // 1. 数据库中的自定义 styleId
  if (input.styleId) {
    const found = await getStyle(input.styleId)
    if (found) return found
  }
  if (input.character.styleId) {
    const found = await getStyle(input.character.styleId)
    if (found) return found
  }
  // 2. 预设 id（不写入数据库，但作为生成参数）
  if (input.stylePresetId) {
    const preset = CHARACTER_STYLE_PRESETS.find((s) => s.id === input.stylePresetId)
    if (preset) {
      return synthesizePresetProfile(preset)
    }
  }
  return undefined
}

function synthesizeStyleProfile(preset: (typeof CHARACTER_STYLE_PRESETS)[number]): StyleProfile {
  return {
    id: preset.id,
    kind: 'style',
    name: preset.label,
    label: preset.label,
    palette: preset.palette,
    lightingMood: preset.lightingMood,
    aspectRatio: '3:4',
    stylePrompt: preset.stylePrompt,
    preferredRenderModels: [env.imageModel],
    tags: [preset.id],
    libraryScoped: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const synthesizePresetProfile = synthesizeStyleProfile

function buildIdentityText(character: CharacterAsset): string {
  const lock = character.visualLock?.identityPrompt?.trim()
  if (lock) return lock
  const parts = [character.name, character.bio, character.personality].filter(Boolean)
  return parts.join('，') || '一名原创人物'
}

function pickExistingUrl(character: CharacterAsset): string | undefined {
  return (
    character.turnaround?.slots?.find((s) => !!s.url)?.url ??
    character.sheets?.find((s) => !!s.url)?.url
  )
}

function pickPlaceholder(
  slot: CharacterTurnaroundSlot,
  character: CharacterAsset,
  style?: StyleProfile,
): string {
  // 简易占位：返回 SVG data URI，避免 UI 空白
  const bg = style?.palette?.[0] ?? '#1f2937'
  const fg = style?.palette?.[1] ?? '#f5f5f5'
  const label = encodeURIComponent(`${character.name}·${slot.label}`)
  return `data:image/svg+xml;utf8,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 540'><rect width='400' height='540' fill='${bg}'/><text x='200' y='280' fill='${fg}' font-size='28' font-family='sans-serif' text-anchor='middle'>${label}</text></svg>`}`
}