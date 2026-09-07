/** Storyboard layer — hook rhythm, frame chaining, action split, quality gates */

/**
 * 卡点类型（四级卡点体系 + 片尾钩子）
 * - gold_3s    一卡：黄金 3 秒，最吸引人的画面/台词（切片引流用）
 * - core_10s   二卡：核心冲突首次呈现
 * - climax_50s 三卡：反转或高潮前铺垫
 * - recurring  日常卡点：每 10–15 秒一个小钩子
 * - tail       片尾钩子：留悬念引下一集
 */
export type HookType = 'gold_3s' | 'core_10s' | 'climax_50s' | 'recurring' | 'tail'

export const HOOK_LABELS: Record<HookType, string> = {
  gold_3s: '一卡 · 黄金3秒',
  core_10s: '二卡 · 核心冲突',
  climax_50s: '三卡 · 反转铺垫',
  recurring: '日常卡点',
  tail: '片尾钩子',
}

/** 3-5-3 节奏模型的一段：前3秒抓人 / 中间推进 / 最后反转留钩 */
export interface RhythmSegment {
  hook: HookType
  startSec: number
  endSec: number
  description: string
}

/**
 * 依据 3-5-3 模型切分单集时间轴。
 * head 固定 3 秒；tail 取 12%（4–7 秒）；三卡落在 tail 起点前。
 */
export function buildRhythmSegments(
  durationSec: number,
  template: '3-5-3' | 'custom' = '3-5-3',
): RhythmSegment[] {
  const total = Math.max(15, Math.round(durationSec))
  if (template === 'custom') {
    return [
      { hook: 'gold_3s', startSec: 0, endSec: total, description: '自定义节奏' },
    ]
  }

  const head = 3
  const tailLen = Math.min(7, Math.max(4, Math.round(total * 0.12)))
  const climaxAt = Math.max(head + 5, total - tailLen)
  const coreEnd = Math.min(10, climaxAt)
  const climaxStart = Math.max(coreEnd, climaxAt - Math.round((climaxAt - coreEnd) * 0.3))

  return [
    {
      hook: 'gold_3s',
      startSec: 0,
      endSec: head,
      description: '冲突/悬念爆发，抓住眼球',
    },
    {
      hook: 'core_10s',
      startSec: head,
      endSec: coreEnd,
      description: '核心冲突首次呈现',
    },
    {
      hook: 'climax_50s',
      startSec: climaxStart,
      endSec: climaxAt,
      description: '反转或高潮前铺垫',
    },
    {
      hook: 'tail',
      startSec: climaxAt,
      endSec: total,
      description: '反转/反击/阶段性胜利，留钩子',
    },
  ]
}

/** 日常卡点时刻：每 intervalSec（默认 12）一个小钩子，避开一/二/三卡区间 */
export function recurringHookTimes(
  durationSec: number,
  intervalSec = 12,
  segments: RhythmSegment[] = buildRhythmSegments(durationSec),
): number[] {
  const protectedRanges = segments
    .filter((s) => s.hook !== 'core_10s')
    .map((s) => [s.startSec, s.endSec] as const)

  const times: number[] = []
  for (let t = intervalSec; t < durationSec - 3; t += intervalSec) {
    const inProtected = protectedRanges.some(([a, b]) => t >= a && t < b)
    if (!inProtected) times.push(t)
  }
  return times
}

/** 判断某个镜头起点是否落在某段卡点区间内 */
export function hookTypeAt(
  startSec: number,
  segments: RhythmSegment[],
  recurringTimes: number[] = [],
): HookType | undefined {
  for (const seg of segments) {
    if (startSec >= seg.startSec && startSec < seg.endSec) return seg.hook
  }
  for (const t of recurringTimes) {
    if (startSec >= t && startSec < t + 2) return 'recurring'
  }
  return undefined
}

/** 首尾帧衔接 —— AI 视频一致性的核心约束 */
export interface FrameChain {
  /** 本镜首帧参考图（通常来自上一镜的尾帧） */
  startFrameUrl?: string
  /** 本镜生成完成后的尾帧（供下一镜引用） */
  endFrameUrl?: string
  /** 首帧的画面描述，未出图时用于提示词约束 */
  startFrameDescription?: string
  /** 尾帧的画面描述 */
  endFrameDescription?: string
  /** 首帧来源镜头 id（尾帧传递链） */
  linkedFromShotId?: string
  /** 与下一镜的过渡方式 */
  transition?: 'cut' | 'dissolve' | 'match_cut'
  /**
   * 衔接锚点（video-prompt-engineer）：与上一镜之间的可见/可听连接。
   * 必须是"可被摄影机记录的物理现象"——动作延续、视线落点、声音延续、
   * 物件传递、光色延续、遮挡转场——而非"上一镜"这类关系指代。
   */
  connection?: string
}

/**
 * 动作链拆分：单个连续动作超过 ~15 秒时拆成多镜
 * 例：「推门 → 走进房间 → 坐下」
 */
export interface ActionChainStep {
  index: number
  description: string
  durationSec: number
}

/** 单镜质量门（阶段 4 每段生成后检查） */
export interface ShotQualityGate {
  /** 角色与定妆照是否一致 */
  characterConsistent?: boolean
  /** 场景与概念图是否一致 */
  sceneConsistent?: boolean
  /** 动作是否连贯无抽搐 */
  motionSmooth?: boolean
  /** 首尾帧是否自然可衔接 */
  frameLinkable?: boolean
  note?: string
  checkedAt?: string
}

export type ShotTransition = 'cut' | 'dissolve' | 'match_cut'
