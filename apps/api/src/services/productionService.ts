import type {
  DramaGenre,
  ExtractProductionInput,
  ProductionExtractResult,
  ProductionMeta,
  RoleMapping,
} from '@bloomani/shared'
import {
  GENRE_HOOK_STRATEGY,
  extractEventsRuleBased,
  looksLikeNovel,
  splitNovelIntoChapters,
  estimateEventCount,
  suggestEpisodeCount,
} from '@bloomani/shared'
import { completeJson } from './llmService.js'
import { loadProject, persistProject } from './projectStore.js'
import { nowIso } from '../store/memory.js'

/**
 * 阶段 0：项目立项与故事萃取。
 * LLM 可用时结构化萃取；不可用时回退到规则化推断，保证流水线不中断。
 */

const GENRE_KEYWORDS: Array<[DramaGenre, RegExp]> = [
  ['ceo', /霸总|总裁|豪门|首富|继承/],
  ['rebirth', /重生|重来|再来一次|回到/],
  ['isekai', /穿越|穿书|异世|架空/],
  ['xianxia', /修仙|玄幻|仙尊|灵气|宗门/],
  ['overlord', /战神|兵王|杀手|最强|无敌/],
  ['suspense', /悬疑|推理|命案|真相|谜/],
  ['sweet', /甜宠|甜|恋爱|暗恋|宠妻/],
  ['family', /家庭|婆媳|亲子|亲情/],
  ['comedy', /搞笑|喜剧|沙雕|爆笑/],
]

const SYSTEM_PROMPT = `你是资深短剧制片人，擅长判断网文 IP 的改编价值。
请从用户提供的原文中萃取立项信息，只输出严格 JSON，不要任何额外说明或 Markdown 围栏之外的内容：
{
  "hook": "一句话核心钩子：谁 + 在什么处境下 + 做了什么 + 结果如何（不超过 40 字）",
  "sellingPoints": ["卖点，最多 5 条，每条不超过 20 字"],
  "targetAudience": "目标受众描述，不超过 30 字",
  "genres": ["从 sweet|overlord|ceo|rebirth|suspense|comedy|xianxia|isekai|family|other 中选 1-2 个"],
  "episodeCount": 30,
  "episodeDurationSec": 60,
  "adaptationNotes": ["强冲突：…", "高频反转：…", "情绪爽点：…"],
  "roleMatrix": [
    { "name": "角色名", "role": "lead|supporting|functional", "description": "不超过 25 字" }
  ]
}
要求：
1. 主角（lead）1-2 人，配角（supporting）2-3 人，功能角色（functional）可合并，总计不超过 6 个。
2. 若原文信息不足，基于已有内容合理推断，不要留空数组。
3. episodeCount 建议 30-60，episodeDurationSec 建议 60-90。
4. 依题材采用差异化卡点策略（甜宠重糖分、战神/霸总重打脸、悬疑重反转埋线）：
   首卡用最强钩子（一卡·黄金3秒），全集保证片尾钩子留悬念。
5. 若原文为小说，识别章节结构与最强冲突事件，作为改编支点。`

interface LlmProduction {
  hook?: string
  sellingPoints?: string[]
  targetAudience?: string
  genres?: string[]
  episodeCount?: number
  episodeDurationSec?: number
  adaptationNotes?: string[]
  roleMatrix?: Array<{ name?: string; role?: string; description?: string }>
}

const VALID_GENRES: DramaGenre[] = [
  'sweet',
  'overlord',
  'ceo',
  'rebirth',
  'suspense',
  'comedy',
  'xianxia',
  'isekai',
  'family',
  'other',
]

function inferGenres(text: string): DramaGenre[] {
  const hits = GENRE_KEYWORDS.filter(([, re]) => re.test(text)).map(([g]) => g)
  return hits.length > 0 ? hits.slice(0, 2) : ['other']
}

function firstSentence(text: string): string {
  const trimmed = text.trim()
  const [head] = trimmed.split(/[。！？!?\n]/)
  return (head || trimmed).trim()
}

function clampCount(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** 小说切片洞察：章节结构 → 事件密度估算集数 + 最强冲突事件 */
function novelInsights(text: string): { episodeCount: number; strongest: string } | null {
  if (!looksLikeNovel(text)) return null
  const chapters = splitNovelIntoChapters(text)
  const events = extractEventsRuleBased(chapters)
  const strongest = [...events].sort((a, b) => b.beat - a.beat)[0]
  const { episodeCount } = suggestEpisodeCount(estimateEventCount(chapters), 30)
  return { episodeCount, strongest: strongest?.excerpt ?? '' }
}

function fallbackProduction(input: ExtractProductionInput): ProductionMeta {
  const text = input.text.trim()
  const head = firstSentence(text)
  const genres = input.genres?.length ? input.genres : inferGenres(text)
  const strategy = GENRE_HOOK_STRATEGY[genres[0] ?? 'other']
  const novel = novelInsights(text)
  const stamp = nowIso()

  const sellingPoints = ['强冲突开局', '高频反转', strategy.beatFocus[0] ? `情绪爆点：${strategy.beatFocus[0]}` : '情绪爽点密集']
  if (novel?.strongest) sellingPoints.push(`原作最强冲突：${novel.strongest.slice(0, 16)}`)

  return {
    hook: head.length <= 40 ? head : `${head.slice(0, 40)}…`,
    sellingPoints: sellingPoints.slice(0, 5),
    targetAudience: '喜欢快节奏爽剧的年轻观众',
    genres,
    episodeCount: input.episodeCount ?? novel?.episodeCount ?? 30,
    episodeDurationSec: clampCount(input.episodeDurationSec, 60, 30, 180),
    rhythmTemplate: '3-5-3',
    adaptationNotes: [
      strategy.rhythmNote,
      `情绪爆点优先识别：${strategy.beatFocus.join('、')}`,
      '（规则化推断）建议人工复核核心钩子与反转密度',
    ],
    roleMatrix: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
}

function normalizeProduction(
  raw: LlmProduction,
  input: ExtractProductionInput,
): ProductionMeta {
  const text = input.text.trim()
  const stamp = nowIso()
  const base = fallbackProduction(input)

  const genres = (raw.genres ?? [])
    .map((g) => g.trim().toLowerCase() as DramaGenre)
    .filter((g) => VALID_GENRES.includes(g))
    .slice(0, 2)
  const primaryGenre = (genres[0] ?? base.genres[0] ?? 'other') as DramaGenre
  const strategy = GENRE_HOOK_STRATEGY[primaryGenre]

  const roleMatrix: RoleMapping[] = (raw.roleMatrix ?? [])
    .filter((r) => r?.name?.trim())
    .slice(0, 6)
    .map((r) => ({
      name: r.name!.trim(),
      role: r.role === 'lead' || r.role === 'supporting' || r.role === 'functional'
        ? r.role
        : 'functional',
      description: r.description?.trim() || undefined,
    }))

  const llmNotes = raw.adaptationNotes?.filter((n) => n?.trim()).slice(0, 3) ?? []
  const adaptationNotes = [...llmNotes, strategy.rhythmNote, `情绪爆点优先：${strategy.beatFocus.join('、')}`].slice(0, 5)

  return {
    hook: raw.hook?.trim() || base.hook,
    sellingPoints:
      raw.sellingPoints?.filter((s) => s?.trim()).slice(0, 5) ?? base.sellingPoints,
    targetAudience: raw.targetAudience?.trim() || base.targetAudience,
    genres: genres.length > 0 ? genres : base.genres,
    episodeCount: clampCount(input.episodeCount ?? raw.episodeCount, base.episodeCount, 1, 120),
    episodeDurationSec: clampCount(
      input.episodeDurationSec ?? raw.episodeDurationSec,
      base.episodeDurationSec,
      30,
      180,
    ),
    rhythmTemplate: '3-5-3',
    adaptationNotes,
    roleMatrix,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export async function extractProduction(
  input: ExtractProductionInput,
): Promise<ProductionExtractResult> {
  const source = input.text.slice(0, 12000)

  const result = await completeJson<LlmProduction>({
    system: SYSTEM_PROMPT,
    user: `【改编来源】${input.source}\n【原文】\n${source}`,
    temperature: 0.4,
    fallback: () => ({}),
  })

  const production = result.usedLlm
    ? normalizeProduction(result.data, input)
    : fallbackProduction(input)

  return {
    production,
    usedLlm: result.usedLlm,
    model: result.model,
    error: result.error,
  }
}

/** 萃取并写回项目的 productionMeta */
export async function runProductionStage(
  projectId: string,
  input: Omit<ExtractProductionInput, 'projectId'>,
): Promise<ProductionExtractResult> {
  const project = await loadProject(projectId)
  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const result = await extractProduction({ ...input, projectId })

  const stamp = nowIso()
  project.productionMeta = {
    ...result.production,
    createdAt: project.productionMeta?.createdAt ?? stamp,
    updatedAt: stamp,
  }
  project.updatedAt = stamp
  await persistProject(project)

  return result
}
