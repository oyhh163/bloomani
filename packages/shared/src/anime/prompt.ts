/**
 * Prompt assembly — 阶段 2→4 的桥梁（融合 storyboard-prompt / ComfyUI-Storyboard-LLM /
 * video-prompt-engineer / storyboard-master 的方法论）。
 *
 * 关键原则：
 *  1. 图像 / 视频提示词解耦：imagePrompt 承载完整定妆与构图（生图/首帧），
 *     videoPrompt 承载动态运动，且必须"独立可执行"（不引用"上一镜"）。
 *  2. 资产纪律：重复/跨镜头元素冻结为 @名称，视频提示词只写一次全描述。
 *  3. 情绪外化：抽象情绪翻译成摄影机可记录的物理现象。
 *  4. 衔接锚点：用动作/视线/声音/物件/光色/遮挡连接相邻镜头。
 *  5. 弱约束剔除：去掉题材定位、宣传形容词等干扰词。
 */

import type { CharacterAsset, SceneAsset, StyleProfile } from './assets.js'
import type { CameraMove, CameraShotSize, ShotSpec } from './screenplay.js'
import { normalizeEmotion } from './decision.js'

export interface PromptTemplate {
  style: string
  scene: string
  character: string
  action: string
  expression: string
  camera: {
    size: CameraShotSize
    move: CameraMove
    angle?: 'high' | 'low' | 'eye'
    notes?: string
  }
  lighting: string
  frame: {
    start?: string
    end?: string
  }
  /** 参考图 URL / data URI（图生图：首帧、定妆照、场景板） */
  referenceImage?: string
  negative?: string

  /** 静态关键帧提示词（生图 / 首帧锚定） */
  imagePrompt: string
  /** 动态视频提示词（生视频，独立可执行） */
  videoPrompt: string
  /** 台词 / 旁白 / 内心 OS（音轨账本） */
  dialogue: string
  /** 声音策略：电影音效、环境声、无配乐指示 */
  audioCues: string
  /** 衔接锚点（与上一镜的可见/可听连接，具体物理现象） */
  connection?: string
  /** 被冻结为 @名称 的复用资产（角色/场景） */
  assets: string[]
}

/** 装配提示词所需的资产上下文（视觉锚点来源） */
export interface PromptContext {
  style?: StyleProfile
  scene?: SceneAsset
  characters?: CharacterAsset[]
  negativePrompt?: string
}

export const CAMERA_SIZE_LABELS_ZH: Record<CameraShotSize, string> = {
  extreme_wide: '大远景',
  wide: '远景',
  medium: '中景',
  close_up: '近景',
  extreme_close_up: '特写',
  pov: '主观视角',
}

export const CAMERA_MOVE_LABELS_ZH: Record<CameraMove, string> = {
  static: '固定机位',
  pan: '摇镜',
  tilt: '俯仰',
  dolly: '推镜',
  track: '移轨',
  crane: '升降',
  handheld: '手持',
  zoom: '变焦',
}

export const CAMERA_SIZE_LABELS_EN: Record<CameraShotSize, string> = {
  extreme_wide: 'extreme wide shot',
  wide: 'wide shot',
  medium: 'medium shot',
  close_up: 'close-up shot',
  extreme_close_up: 'extreme close-up',
  pov: 'POV shot',
}

export const CAMERA_MOVE_LABELS_EN: Record<CameraMove, string> = {
  static: 'static camera',
  pan: 'pan',
  tilt: 'tilt',
  dolly: 'dolly in',
  track: 'tracking shot',
  crane: 'crane shot',
  handheld: 'handheld',
  zoom: 'zoom',
}

const ANGLE_LABELS_ZH: Record<string, string> = {
  high: '俯拍',
  low: '仰拍',
  eye: '平视',
}

/** 情绪外化：抽象情绪 → 摄影机可记录的物理现象 */
const EMOTION_EXTERNAL: Record<string, string> = {
  shock: '瞳孔骤缩，身体僵住一瞬',
  tense: '肩线紧绷，指尖无意识叩击',
  warm: '嘴角微扬，肩膀松弛',
  curious: '微微前倾，目光追随',
  sad: '视线低垂，手指收紧衣角',
  joy: '眼睛发亮，步子轻快',
  neutral: '',
}

/** 弱约束词：题材定位/宣传形容词，生视频提示词时应剔除 */
const WEAK_CONSTRAINTS = ['精美的', '精彩的', '震撼的', '极具观赏性的', '一部关于', '令人', '十分', '非常']

/** 关系式指代：独立可执行原则要求剔除（"上一镜"等） */
const RELATIONAL_REFERENCES = ['上一镜', '刚才', '之前', '前一场', '上一段', '随后']

/** 从镜头 + 资产上下文装配结构化提示词（含图像/视频双轨） */
export function buildPromptTemplate(shot: ShotSpec, ctx: PromptContext = {}): PromptTemplate {
  const { style, scene, characters, negativePrompt } = ctx

  const picked = (shot.characterIds ?? [])
    .map((cid) => characters?.find((c) => c.id === cid))
    .filter((c): c is CharacterAsset => Boolean(c))

  const frozenTokens = picked.map((c) => `@${c.name}`)
  const sceneText = pickSceneText(shot, scene)
  // 固定/复用场景：视频轨只保留锚定 token；一次性场景：内联简述
  const sceneIsFixed = Boolean(scene?.consistencyPrompt)
  const sceneVideoRef = sceneIsFixed ? '@主场景' : sceneText

  const size =
    shot.camera.size === 'extreme_wide'
      ? CAMERA_SIZE_LABELS_ZH.extreme_wide
      : CAMERA_SIZE_LABELS_ZH[shot.camera.size]
  const move = CAMERA_MOVE_LABELS_ZH[shot.camera.move]
  const angle = shot.camera.angle ? ANGLE_LABELS_ZH[shot.camera.angle] : ''
  const lighting = buildLighting(style, scene)
  const external = EMOTION_EXTERNAL[normalizeEmotion(shot.emotion)] ?? ''
  const dialogueText = (shot.dialogue ?? [])
    .map((d) => (d.voiceOver ? `（旁白）${d.text}` : d.text))
    .join('；')

  const connection = shot.frameChain?.connection

  const imagePrompt = [
    style?.stylePrompt?.trim() || '青春动漫风格，干净线条，柔和色彩',
    sceneVideoRef ? `场景：${sceneVideoRef}` : '',
    picked.length ? `角色：${picked.map((c) => c.visualLock.identityPrompt).join('；')}` : '',
    shot.action?.trim() ? `动作：${shot.action.trim()}` : '',
    shot.emotion?.trim() ? `表情：${external || shot.emotion.trim()}` : '',
    `镜头：${[size, angle, move].filter(Boolean).join('，')}`,
    shot.camera.notes ? `运镜备注：${shot.camera.notes}` : '',
    `光线：${lighting}`,
    shot.frameChain?.startFrameDescription ? `首帧：${shot.frameChain.startFrameDescription}` : '',
    shot.frameChain?.endFrameDescription ? `尾帧：${shot.frameChain.endFrameDescription}` : '',
  ]
    .filter(Boolean)
    .join(' | ')

  let videoBody = [
    `动作：${[shot.action?.trim() || '', external].filter(Boolean).join('，')}`,
    picked.length ? `角色：${frozenTokens.join('，')}` : '',
    sceneVideoRef ? `场景：${sceneVideoRef}` : '',
    `镜头：${[size, angle, move].filter(Boolean).join('，')}`,
    `光线：${lighting}`,
    shot.frameChain?.startFrameDescription ? `首帧：${shot.frameChain.startFrameDescription}` : '',
    shot.frameChain?.endFrameDescription ? `尾帧：${shot.frameChain.endFrameDescription}` : '',
    connection ? `衔接：${connection}` : '',
  ]
    .filter(Boolean)
    .join('. ')

  videoBody = stripWeakConstraints(videoBody)
  if (!dialogueText) videoBody += '. 无台词，电影音效与自然环境声'

  const template: PromptTemplate = {
    style: style?.stylePrompt?.trim() || '青春动漫风格，干净线条，柔和色彩',
    scene: sceneText,
    character: picked.length ? picked.map((c) => c.visualLock.identityPrompt).join('；') : '',
    action: shot.action?.trim() || '',
    expression: shot.emotion?.trim() || '',
    camera: {
      size: shot.camera.size,
      move: shot.camera.move,
      angle: shot.camera.angle,
      notes: shot.camera.notes,
    },
    lighting,
    frame: {
      start: shot.frameChain?.startFrameDescription,
      end: shot.frameChain?.endFrameDescription,
    },
    referenceImage: shot.frameChain?.startFrameUrl ?? picked[0]?.sheets?.[0]?.url,
    negative: negativePrompt,
    imagePrompt,
    videoPrompt: videoBody,
    dialogue: dialogueText,
    audioCues: dialogueText ? '对白 + 电影音效，无背景音乐' : '电影音效与环境声，无配乐',
    connection,
    assets: frozenTokens,
  }

  return template
}

function pickSceneText(shot: ShotSpec, scene?: SceneAsset): string {
  if (shot.sceneAssetId && scene?.id === shot.sceneAssetId) {
    return scene.consistencyPrompt || scene.description
  }
  if (shot.sceneAssetId && scene?.id !== shot.sceneAssetId) return ''
  return scene?.consistencyPrompt || scene?.description || ''
}

function buildLighting(style?: StyleProfile, scene?: SceneAsset): string {
  const parts = [
    style?.lightingMood,
    scene?.environment?.lighting,
    scene?.environment?.timeOfDay ? `时间：${scene.environment.timeOfDay}` : '',
    scene?.environment?.mood ? `氛围：${scene.environment.mood}` : '',
  ].filter(Boolean)
  return parts.join('，') || '自然柔光'
}

/** 剔除弱约束词与关系式指代，保证视频提示词独立可执行 */
export function stripWeakConstraints(text: string): string {
  let out = text
  for (const w of WEAK_CONSTRAINTS) out = out.split(w).join('')
  for (const r of RELATIONAL_REFERENCES) out = out.split(r).join('')
  return out.replace(/\s{2,}/g, ' ').trim()
}

/** 渲染静态关键帧提示词（兼容旧调用，返回 imagePrompt） */
export function renderVisualPrompt(template: PromptTemplate, _language: 'zh' | 'en' = 'zh'): string {
  return template.imagePrompt
}

/** 渲染视频提示词（英文，适配 Seedance/Sora 类模型） */
export function renderVideoPromptEn(template: PromptTemplate): string {
  const size = CAMERA_SIZE_LABELS_EN[template.camera.size]
  const move = CAMERA_MOVE_LABELS_EN[template.camera.move]
  const angle =
    template.camera.angle === 'high'
      ? 'high angle'
      : template.camera.angle === 'low'
        ? 'low angle'
        : 'eye level'

  const parts = [
    template.style,
    template.scene ? `scene: ${template.scene}` : '',
    template.character ? `character: ${template.character}` : '',
    template.action ? `action: ${template.action}` : '',
    template.expression ? `expression: ${template.expression}` : '',
    `camera: ${size}, ${angle}, ${move}`,
    template.camera.notes ? `camera notes: ${template.camera.notes}` : '',
    `lighting: ${template.lighting}`,
    template.frame.start ? `first frame: ${template.frame.start}` : '',
    template.frame.end ? `last frame: ${template.frame.end}` : '',
    template.connection ? `continuity: ${template.connection}` : '',
  ].filter(Boolean)
  return parts.join('. ')
}

export interface AgnesImagePayloadOptions {
  model: string
  size?: string
  ratio?: string
}

export interface AgnesVideoPayloadOptions {
  model: string
  width?: number
  height?: number
  numFrames?: number
  frameRate?: number
}

/** 图片模型请求体（Agnes /v1/images/generations） */
export function toAgnesImagePayload(
  template: PromptTemplate,
  opts: AgnesImagePayloadOptions,
): Record<string, unknown> {
  const extra: Record<string, unknown> = { response_format: 'url' }
  if (template.referenceImage) extra.image = template.referenceImage

  return {
    model: opts.model,
    prompt: template.imagePrompt,
    size: opts.size ?? '1K',
    ratio: opts.ratio ?? '3:4',
    extra_body: extra,
  }
}

/** 视频模型请求体（Agnes /v1/videos），首帧走 image 字段 */
export function toAgnesVideoPayload(
  template: PromptTemplate,
  shot: ShotSpec,
  opts: AgnesVideoPayloadOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: opts.model,
    prompt: template.videoPrompt,
    width: opts.width ?? 720,
    height: opts.height ?? 1280,
    num_frames: opts.numFrames ?? 121,
    frame_rate: opts.frameRate ?? 24,
  }

  // 首尾帧控制法：首帧 = 上一镜尾帧
  const startFrame = shot.frameChain?.startFrameUrl
  if (startFrame) body.image = startFrame

  if (template.negative) body.negative_prompt = template.negative
  return body
}

// ─────────────────────────────────────────────────────────────────────
// Character turnaround (三视图 / 定妆照)
// ─────────────────────────────────────────────────────────────────────

import type { CharacterTurnaroundSlot } from './assets.js'

/**
 * 内置角色风格预设（开箱即用）。
 * 风格选择会直接拼接到角色三视图提示词里，决定成片的画风。
 */
export interface CharacterStylePreset {
  id: string
  label: string
  /** 中文描述 */
  description: string
  /** 风格短词（用于提示词） */
  stylePrompt: string
  /** 推荐调色板 */
  palette: string[]
  /** 光线 / 氛围关键字 */
  lightingMood: string
}

export const CHARACTER_STYLE_PRESETS: CharacterStylePreset[] = [
  {
    id: 'anime-fantasy',
    label: '日系动漫',
    description: '高饱和度、二次元日系画风，角色精致、色彩明快',
    stylePrompt: '日系动漫插画，二次元，二头身到大头身比例，精致立绘，赛璐璐着色',
    palette: ['#7BC8FF', '#FFD9B0', '#F2A1C4'],
    lightingMood: '柔和三点光，景深虚化',
  },
  {
    id: 'realistic-cinematic',
    label: '真人电影',
    description: '超写实、好莱坞电影质感，戏剧化打光',
    stylePrompt: '超写实摄影，欧美电影剧照，超清人像，胶片色调，皮肤质感真实',
    palette: ['#3A3A3A', '#D9B280', '#C9D7E0'],
    lightingMood: '伦勃朗光与轮廓光，体积感强',
  },
  {
    id: 'pixar-3d',
    label: '皮克斯 3D',
    description: '皮克斯 / 迪士尼三维角色风格，立体可爱',
    stylePrompt: '皮克斯 3D 风格 CG 角色，电影级三维渲染，毛发细腻，明亮圆润',
    palette: ['#FFB85C', '#5EC4D7', '#FFE0B0'],
    lightingMood: 'HDRI 全局光照，柔和漫射',
  },
  {
    id: 'cyberpunk',
    label: '赛博朋克',
    description: '赛博朋克霓虹、未来科技感',
    stylePrompt: '赛博朋克霓虹质感，未来科技，机械义体，雨夜霓虹灯，全息投影',
    palette: ['#FF2EC4', '#1FE8FF', '#0B0F2A'],
    lightingMood: '霓虹灯反射与体积雾，强烈对比',
  },
  {
    id: 'ink-xianxia',
    label: '水墨仙侠',
    description: '国风水墨、仙侠志怪',
    stylePrompt: '国风水墨工笔，仙侠志怪，山雾与云气，留白构图，线条飘逸',
    palette: ['#2E2A24', '#9DC4B5', '#E8D8B7'],
    lightingMood: '山水留白，墨色晕染',
  },
  {
    id: 'comic-western',
    label: '欧美漫画',
    description: '美式漫画 / 漫画电影风格，粗描与平涂',
    palette: ['#1A1A1A', '#FFD23F', '#E63946'],
    stylePrompt: '美式漫画封面，cel shading，强势轮廓线，戏剧化构图',
    lightingMood: '高对比度主光，强烈阴影',
  },
]

/** 一个标准四视图：头像 + 正面 + 背面 + 侧面 */
export const DEFAULT_TURNAROUND_SLOTS: CharacterTurnaroundSlot[] = [
  {
    id: 'head',
    label: '头像',
    view: 'expression',
    pose: '正面头像特写，自然表情，五官清晰，眼神明亮',
  },
  {
    id: 'front',
    label: '正面全身',
    view: 'front',
    pose: '正面全身直立，A 字型站姿，双手自然下垂，正对镜头',
  },
  {
    id: 'back',
    label: '背面全身',
    view: 'back',
    pose: '背面全身直立，A 字型站姿，双手自然下垂，背对镜头',
  },
  {
    id: 'side',
    label: '侧面全身',
    view: 'side',
    pose: '90 度侧面全身直立，A 字型站姿，双手自然下垂，侧对镜头',
  },
]

export interface BuildTurnaroundPromptInput {
  /** 角色描述 / identity prompt */
  identity: string
  /** 风格（StyleProfile） */
  style?: StyleProfile
  /** 风格快照（脱离 style 表单） */
  styleSnapshot?: { label: string; stylePrompt: string; palette?: string[] }
  /** 角色 nickname / 营销描述 */
  tagline?: string
  /** 视图槽 */
  slot: CharacterTurnaroundSlot
  /** 参考图（用于 I2I 锁定形象） */
  referenceImages?: string[]
}

/**
 * 构造单个三视图槽的提示词：
 *  风格段（style） + 身份段（identity） + 姿势段（pose） + 定妆约束。
 *
 *  - 全身镜头（front/back/side）使用 3:4 立绘，姿态、表情、构图保持一致。
 *  - 头像特写（head）使用 1:1，明确要求面部特征可辨识。
 */
export function buildTurnaroundPrompt(input: BuildTurnaroundPromptInput): string {
  const stylePrompt = input.style?.stylePrompt?.trim() || input.styleSnapshot?.stylePrompt?.trim()
  const lightingMood = input.style?.lightingMood
  const palette = (input.style?.palette ?? input.styleSnapshot?.palette ?? []).join('，')
  const tagline = input.tagline?.trim()

  const segments: string[] = []
  if (stylePrompt) segments.push(`风格：${stylePrompt}`)
  if (lightingMood) segments.push(`光线：${lightingMood}`)
  if (palette) segments.push(`色调：${palette}`)
  if (tagline) segments.push(`角色定位：${tagline}`)
  segments.push(`角色：${input.identity.trim()}`)
  segments.push(`姿势：${input.slot.pose}`)

  if (input.slot.id === 'head') {
    segments.push('画面以头部为主，五官清晰可辨，瞳孔颜色、眉形、刘海轮廓一致')
    segments.push('纯色或渐变背景，主体居中，正面视角')
  } else {
    segments.push('全身立绘构图，画面完整包含头顶到脚底，背景简洁以突出角色')
    segments.push('保持发型发色、五官、身高比例、服饰款式、配色与正面全身一致')
    segments.push('白色或低饱和度背景，人物居中，无杂物')
  }

  return segments.filter(Boolean).join(' | ')
}

/**
 * 把三视图提示词包装成 Agnes Image 接口入参。
 * 全身走 3:4，头像走 1:1，更接近参考图的版面比例。
 */
export function toAgnesTurnaroundPayload(
  prompt: string,
  opts: {
    model: string
    slot: CharacterTurnaroundSlot
    referenceImages?: string[]
  },
): Record<string, unknown> {
  const isHead = opts.slot.id === 'head'
  const extra: Record<string, unknown> = { response_format: 'url' }
  if (opts.referenceImages?.length) extra.image = opts.referenceImages
  return {
    model: opts.model,
    prompt,
    size: '1K',
    ratio: isHead ? '1:1' : '3:4',
    extra_body: extra,
  }
}
