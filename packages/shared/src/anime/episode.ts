/** Stage 0–1: production setup (立项萃取) + episode breakdown (分集剧本) */

import type { HookType } from './storyboard.js'
import type {
  ScreenplayBeat,
  ScreenplayScene,
  ShotSpec,
} from './screenplay.js'

export type DramaGenre =
  | 'sweet'
  | 'overlord'
  | 'ceo'
  | 'rebirth'
  | 'suspense'
  | 'comedy'
  | 'xianxia'
  | 'isekai'
  | 'family'
  | 'other'

export const GENRE_LABELS: Record<DramaGenre, string> = {
  sweet: '甜宠',
  overlord: '战神',
  ceo: '霸总',
  rebirth: '重生',
  suspense: '悬疑',
  comedy: '喜剧',
  xianxia: '玄幻',
  isekai: '穿越',
  family: '家庭',
  other: '其他',
}

/**
 * 题材差异化卡点策略（short-drama-script 思路）：
 * 不同题材的"最强钩子"落点与反转节奏不同，立项萃取据此选择卡点组合与改编重点。
 *  - firstHook：全集最强悬念建议落点
 *  - hookTypes：应重点保证的卡点类型
 *  - beatFocus：改编价值判断时优先识别的情绪爆点类型
 */
export interface GenreHookStrategy {
  firstHook: string
  hookTypes: HookType[]
  beatFocus: string[]
  rhythmNote: string
}

export const GENRE_HOOK_STRATEGY: Record<DramaGenre, GenreHookStrategy> = {
  sweet: {
    firstHook: '甜系氛围 + 心动瞬间',
    hookTypes: ['gold_3s', 'recurring', 'tail'],
    beatFocus: ['心动', '误会', '双向奔赴'],
    rhythmNote: '以高频糖分与轻微误会维持追更，片尾留约会与身份悬念',
  },
  overlord: {
    firstHook: '隐忍受辱 → 身份揭晓',
    hookTypes: ['gold_3s', 'core_10s', 'climax_50s', 'tail'],
    beatFocus: ['欺辱', '反击', '身份反转'],
    rhythmNote: '每集必有一打脸，三卡落在身份揭晓前的极致压制',
  },
  ceo: {
    firstHook: '契约/误会开局 + 强占有欲',
    hookTypes: ['gold_3s', 'core_10s', 'tail'],
    beatFocus: ['误会', '占有', '吃醋'],
    rhythmNote: '以霸总人设与反差萌制造爽点，片尾留关系悬念',
  },
  rebirth: {
    firstHook: '重生觉醒 + 逆天改命',
    hookTypes: ['gold_3s', 'climax_50s', 'tail'],
    beatFocus: ['觉醒', '逆袭', '复仇'],
    rhythmNote: '利用"已知未来"制造信息差爽感，每集一个打脸节点',
  },
  suspense: {
    firstHook: '谜案开场 + 致命伏笔',
    hookTypes: ['gold_3s', 'core_10s', 'climax_50s', 'recurring', 'tail'],
    beatFocus: ['谜团', '反转', '危机'],
    rhythmNote: '高频反转，日常卡点用于埋线，片尾留新线索',
  },
  comedy: {
    firstHook: '荒诞反差 + 笑点前置',
    hookTypes: ['gold_3s', 'recurring', 'tail'],
    beatFocus: ['反差', '社死', '误会'],
    rhythmNote: '笑点密度优先，每 10 秒一个小钩子',
  },
  xianxia: {
    firstHook: '废柴/封印觉醒 + 天地异象',
    hookTypes: ['gold_3s', 'climax_50s', 'tail'],
    beatFocus: ['觉醒', '突破', '宿命'],
    rhythmNote: '以境界突破为爽点，三卡落在秘境/大能现身前',
  },
  isekai: {
    firstHook: '穿越瞬间 + 金手指到账',
    hookTypes: ['gold_3s', 'climax_50s', 'tail'],
    beatFocus: ['穿越', '开挂', '逆袭'],
    rhythmNote: '利用信息差与系统爽感，每集一个能力升级',
  },
  family: {
    firstHook: '代际冲突 + 温情反转',
    hookTypes: ['gold_3s', 'core_10s', 'recurring', 'tail'],
    beatFocus: ['误解', '和解', '守护'],
    rhythmNote: '以情绪曲线推动，片尾留亲情悬念',
  },
  other: {
    firstHook: '强冲突开局',
    hookTypes: ['gold_3s', 'core_10s', 'climax_50s', 'tail'],
    beatFocus: ['冲突', '反转'],
    rhythmNote: '默认 3-5-3，三卡铺反转、片尾留钩',
  },
}

/** 角色矩阵映射：主角 / 配角 / 功能角色（可合并） */
export interface RoleMapping {
  name: string
  role: 'lead' | 'supporting' | 'functional'
  description?: string
  /** 关联到资产库的 CharacterAsset.id */
  characterId?: string
  /** 由哪几个原作角色合并而来 */
  mergedFrom?: string[]
}

/** 阶段 0 产出：立项萃取结果 */
export interface ProductionMeta {
  /** 核心钩子：谁 + 在什么处境下 + 做了什么 + 结果如何 */
  hook: string
  sellingPoints: string[]
  targetAudience?: string
  genres: DramaGenre[]
  /** 全剧集数（短剧常见 30–60 集） */
  episodeCount: number
  /** 单集时长（常见 60–90 秒） */
  episodeDurationSec: number
  rhythmTemplate: '3-5-3' | 'custom'
  /** 改编价值判断：强冲突 / 高频反转 / 情绪爽点 */
  adaptationNotes?: string[]
  roleMatrix: RoleMapping[]
  createdAt: string
  updatedAt: string
}

export type EpisodeStatus = 'draft' | 'scripted' | 'storyboarded' | 'rendering' | 'edited' | 'failed'

/** 单句对白（章节脚本层，独立于分镜的 shot.dialogue） */
export interface ScriptDialogue {
  id: string
  characterName: string
  line: string
  emotion?: string
  /** 元数据：标识对白来源；非渲染字段，前端可据此显示"AI 未运行"等警告 */
  _ai?: 'fallback' | 'llm'
}

/** 章节脚本中的一个场景 */
export interface ScriptScene {
  id: string
  location: string
  timeOfDay: 'day' | 'night' | 'dawn' | 'dusk'
  action: string
  dialogues: ScriptDialogue[]
  /** 元数据：标识场景来源；前端据此显示兜底警告 */
  _ai?: 'fallback' | 'llm'
}

/**
 * 单集「剧本内容」：由 LLM 在分集拆解后扩写生成，
 * 是分镜（shots）的真实来源，保证每集内容独立、可读。
 */
export interface EpisodeScriptBody {
  summary: string
  scenes: ScriptScene[]
  characterNames: string[]
  props: string[]
  durationSec: number
}

/** 阶段 1 产出：单集剧本 + 分镜 */
export interface Episode {
  id: string
  projectId: string
  userId: string
  screenplayId?: string
  index: number
  title: string
  synopsis: string
  durationSec: number
  beats: ScreenplayBeat[]
  scenes: ScreenplayScene[]
  /** 剧本内容（章节脚本）：分镜的真实来源 */
  scriptBody?: EpisodeScriptBody
  shots: ShotSpec[]
  /** 卡点 → 镜头 id，便于切片引流 */
  hookShots: Partial<Record<HookType, string>>
  status: EpisodeStatus
  updatedAt: string
}

export interface ExtractProductionInput {
  projectId: string
  source: 'novel' | 'idea' | 'script'
  /** 小说正文 / 创意描述 / 已有剧本 */
  text: string
  episodeCount?: number
  episodeDurationSec?: number
  genres?: DramaGenre[]
}

export interface BuildEpisodesInput {
  projectId: string
  screenplayId?: string
  /** 覆盖立项时的集数 */
  episodeCount?: number
  episodeDurationSec?: number
  /** 每集镜头数范围，默认 10–15 */
  shotsPerEpisode?: number
}

/** 阶段 0 抽取结果：标注是否走了 LLM，便于前端提示"规则化回退" */
export interface ProductionExtractResult {
  production: ProductionMeta
  usedLlm: boolean
  model: string
  error?: string
}

/** 阶段 1 分集结果 */
export interface EpisodeBreakdownResult {
  episodes: Episode[]
  usedLlm: boolean
  model: string
  error?: string
}

/** 阶段 4 质量门报告 */
export interface QualityGateReportData {
  episodeCount: number
  shotCount: number
  renderedShots: number
  framedShots: number
  hookCoverage: Partial<Record<HookType, number>>
  issues: string[]
  passed: boolean
}
