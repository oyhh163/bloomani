/**
 * 确定性分镜决策引擎（storyboard-master 风格）。
 *
 * 设计原则：相同输入 → 相同输出，纯查表不依赖随机，便于单元测试与跨模型一致。
 * 六维特征 → 五张决策表（景别 / 角度 / 运镜 / 光影 / 时长档位），带冲突仲裁。
 */

import type { CameraMove, CameraShotSize } from './screenplay.js'

export type ShotAngle = 'high' | 'low' | 'eye'
export type ContentType = 'action' | 'dialogue' | 'emotion' | 'reveal' | 'transition'
export type InfoFocus = 'character' | 'environment' | 'object' | 'relationship'
export type EmotionTone = 'tense' | 'shock' | 'warm' | 'curious' | 'sad' | 'joy' | 'neutral'
export type PowerRelation = 'dominant' | 'equal' | 'submissive'
export type Pacing = 'fast' | 'medium' | 'slow'

export interface ShotFeatures {
  contentType: ContentType
  focus: InfoFocus
  emotion: EmotionTone
  power: PowerRelation
  /** 空间复杂度：是否需要建立环境（wide）还是亲密特写（intimate） */
  space: 'wide' | 'intimate'
  pacing: Pacing
}

export interface ShotDecision {
  size: CameraShotSize
  angle: ShotAngle
  move: CameraMove
  durationSec: number
  /** 光影基调（用于提示词装配） */
  lighting: string
}

/** 内容类型 → 景别（建立冲突/环境用大景别，情绪用近景） */
const SIZE_BY_CONTENT: Record<ContentType, CameraShotSize> = {
  action: 'wide',
  dialogue: 'medium',
  emotion: 'close_up',
  reveal: 'extreme_wide',
  transition: 'medium',
}

/** 强情绪 → 景别覆盖（优先级高于内容类型） */
const SIZE_BY_EMOTION: Partial<Record<EmotionTone, CameraShotSize>> = {
  shock: 'extreme_close_up',
  sad: 'close_up',
  warm: 'medium',
  joy: 'medium',
}

/** 权力关系 → 角度（仰拍显强，俯拍显弱，平视对等） */
const ANGLE_BY_POWER: Record<PowerRelation, ShotAngle> = {
  dominant: 'low',
  equal: 'eye',
  submissive: 'high',
}

/** 内容 + 情绪 → 运镜 */
const MOVE_BY_CONTENT: Record<ContentType, CameraMove> = {
  action: 'track',
  dialogue: 'static',
  emotion: 'static',
  reveal: 'dolly',
  transition: 'static',
}

const MOVE_BY_EMOTION: Partial<Record<EmotionTone, CameraMove>> = {
  shock: 'zoom',
  tense: 'handheld',
  curious: 'pan',
  sad: 'static',
}

const LIGHTING_BY_EMOTION: Record<EmotionTone, string> = {
  tense: '高对比硬光，阴影压暗',
  shock: '冷调强逆光，画面定格',
  warm: '柔和暖光，自然散射',
  curious: '明亮散射光，细节清晰',
  sad: '低照度冷调，剪影感',
  joy: '通透暖光，轻微光斑',
  neutral: '自然日光，平整布光',
}

const DURATION_BY_PACING: Record<Pacing, number> = {
  fast: 5,
  medium: 7,
  slow: 9,
}

/** 把任意情绪字符串归一到 EmotionTone（兼容 Beat.emotion 的随意取值） */
export function normalizeEmotion(raw: string | undefined): EmotionTone {
  const e = (raw ?? '').toLowerCase()
  if (/(shock|震惊|惊|震|骇|震怖)/.test(e)) return 'shock'
  if (/(tense|紧|悬|危|恐|压)/.test(e)) return 'tense'
  if (/(warm|温|暖|柔|治愈)/.test(e)) return 'warm'
  if (/(curious|好|探|奇|疑|秘)/.test(e)) return 'curious'
  if (/(sad|悲|伤|哭|丧|寂)/.test(e)) return 'sad'
  if (/(joy|喜|甜|乐|爱|幸)/.test(e)) return 'joy'
  return 'neutral'
}

/**
 * 核心决策：六维 → 五表 + 冲突仲裁。
 * 仲裁优先级：情绪 > 内容（景别/运镜）、内容 > 情绪（角度/时长由各自维度决定）。
 */
export function decideShot(features: ShotFeatures): ShotDecision {
  const size = SIZE_BY_EMOTION[features.emotion] ?? SIZE_BY_CONTENT[features.contentType]
  const move = MOVE_BY_EMOTION[features.emotion] ?? MOVE_BY_CONTENT[features.contentType]
  const angle = ANGLE_BY_POWER[features.power]
  const lighting = LIGHTING_BY_EMOTION[features.emotion]
  const durationSec = DURATION_BY_PACING[features.pacing]

  // 空间维度兜底：需要建立环境但被情绪压成特写时，回退到接近的中景以保留环境信息
  const resolvedSize: CameraShotSize =
    features.space === 'wide' && (size === 'extreme_close_up' || size === 'close_up')
      ? 'medium'
      : size

  return { size: resolvedSize, angle, move, durationSec, lighting }
}
