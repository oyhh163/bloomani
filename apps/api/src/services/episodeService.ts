import type {
  BuildEpisodesInput,
  CharacterAsset,
  Episode,
  EpisodeBreakdownResult,
  EpisodeScriptBody,
  HookType,
  Project,
  QualityGateReportData,
  ShotSpec,
} from '@bloomani/shared'
import {
  buildRhythmSegments,
  hookTypeAt,
  recurringHookTimes,
} from '@bloomani/shared'
import { completeJson } from './llmService.js'
import { db, id, nowIso } from '../store/memory.js'
import { env } from '../config/env.js'
import {
  buildPromptTemplate,
  type PromptContext,
} from '@bloomani/shared'
import {
  decideShot,
  type EmotionTone,
  type ShotFeatures,
} from '@bloomani/shared'
import {
  looksLikeNovel,
  splitNovelIntoChapters,
  suggestEpisodeCount,
  estimateEventCount,
} from '@bloomani/shared'
import { GENRE_HOOK_STRATEGY, GENRE_LABELS, type DramaGenre } from '@bloomani/shared'
import { getScreenplay } from './screenplayService.js'
import { loadProject } from './projectStore.js'

// ---------------------------------------------------------------------------
// 阶段 1：分集拆解（3-5-3 卡点 + 首尾帧链）
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `你是短剧编剧。把给定的「本集原文」扩写成单集剧本。

## 严格规则（违反任何一条就视为错误输出）
1. 只能扩写给定的「本集原文」段内的事件。禁止添加原文段里没有出现的人物、姓名、事件、转折、场景、时间。
2. 只能使用「本集原文」段里实际出现过的名字（dialogues.name 必须落在原文段已出现的人名集合内）。如果原文段没出现新名字，对白里就不出现这个人。
3. 只能写事件：禁止外貌/服装/五官/身高/设定/性格/心理独白类描述，禁止"看着镜子里的自己""炯炯有神""身形修长"等。
   - action 只能写"谁在什么地点做了什么、结果如何"。
   - 不出现"镜中映出""他/她看自己"这类内省/外貌描写。
4. 内容完整：把该段事件讲清楚（起因→经过→结果），不要一句话带过。
   - 3 个 scene。
   - 每个 scene.action 写 2-3 句，交代动作与结果；句子必须写完整，禁止半句截断。
   - 每个 scene.dialogues 给 2-3 句对白（name/line/emotion），对白要紧扣本段事件。
   - dialogues.line 必须是完整句子（可说出口的台词或旁白），禁止在句子中间截断，禁止把叙述动作硬截成半句台词。
5. 承接：本集开头承接「上集结尾」（如果是开篇，则从本段开头讲起）；结尾留一个能引出下一集的悬念。
6. 语言：纯中文，禁止中英混杂（不要出现 streets、deep、meeting 等漏译的英文）。
7. 输出纯 JSON，不要解释，不要代码块围栏。

## 标题
title 用 4-6 字短语，概括本段核心事件，不要写"第 N 集"。

JSON 结构：
{"episodes":[{"index","title","synopsis","beats":[{"summary","emotion"}],"script":{"summary","scenes":[{"location","timeOfDay","action","dialogues":[{"name","line","emotion"}]}],"characterNames":[],"props":[]}}]}`

/** 单批生成的集数上限：每批只生成 2 集，把单次输出控制在小而稳的范围内，
 *  避免内容丰富时撞 maxTokens 被截断。 */
const BATCH_SIZE = 2

function buildBatchPrompt(opts: {
  script: string
  segs: Array<{ body: string; tail: string }>
  startIndex: number
  prevEnding: string
  characterNames: string[]
  durationSec: number
}): string {
  const { segs, startIndex, prevEnding, durationSec } = opts
  // 关键：只把本批要扩写的段给 LLM，不再丢整本全文（避免 LLM 偷用其它段的人名/事件）
  // 题材判断只用本批原文的一段（够准）
  const sampleScript = segs.map((s) => s.body).join(' ')
  const genre = detectGenre(sampleScript)
  const strategy = GENRE_HOOK_STRATEGY[genre]
  const hookHint = `本剧题材偏向「${GENRE_LABELS[genre]}」，卡点策略：${strategy.rhythmNote}；情绪爆点优先识别：${strategy.beatFocus.join('、')}。`

  const plan = segs
    .map((s, i) => {
      const g = startIndex + i + 1
      const prev = i === 0 ? prevEnding || '【开篇，从本段开头讲起】' : segs[i - 1].tail
      // 从本段原文里实际抽取中文人名（2-4 字），让 LLM 只能在这几个人名里选 dialogues.name
      const namesInSeg = extractNamesInText(s.body)
      const nameHint = namesInSeg.length
        ? `本段已出现的人名：${namesInSeg.join('、')}（dialogues.name 必须从这里面选，禁用其他名字）`
        : '本段没有出现具体人名（dialogues.name 用"她""他""众人""路人"等代称，不要编造新名字）'
      return `#第 ${g} 集
  承接上集结尾：「${prev}」
  本集须扩写的原文段（只能扩写这一段，禁止加入段外的人物/事件/场景/时间）：
  「${s.body}」
  本集须止于：「${s.tail}」
  ${nameHint}`
    })
    .join('\n\n')

  return `本批任务：共 ${segs.length} 集，每集约 ${durationSec} 秒。
${hookHint}

${plan}

要求（违反即错误）：
- 只能扩写上面分配的原文段，禁止把别的段的人名/事件/场景/时间塞进本集。
- dialogues.name 只能从该集人名列表里选，禁用任何段外名字。
- 禁止写外貌/服装/五官/身高/设定/性格/镜中映照类描写。
- 纯中文输出，禁用中英混杂。
- 输出纯 JSON，不要解释，不要代码块围栏。`
}

/** 从一段中文文本里提取可能的人名（连续 2-4 个汉字，前后是中文边界）。
 *  简单启发：先抓 2-4 字"姓+名"模式 + 排除常见停用词/动词。 */
/** 输入质量预检：返回 null 表示通过；返回字符串表示错误原因。
 *  避免在内容太短 / 全是外貌描写 / 乱码时强行拆出低质量剧本 */
function checkInputQuality(script: string): string | null {
  const trimmed = script.trim()
  if (trimmed.length < 40) {
    return '剧本内容过短（少于 40 字），请补充剧情后再生成。'
  }
  // 抽事件句（过滤外貌/设定）
  const sentences = trimmed
    .split(/[。！？!?；;\n]/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6)
    .filter((s) => !looksLikeAppearanceOrSetting(s))
  if (sentences.length === 0) {
    return '剧本内容缺少可拆解的事件（只看到外貌/设定类描述），请补充具体剧情后再生成。'
  }
  if (sentences.length < 3) {
    return `剧本事件过少（仅 ${sentences.length} 句可拆解事件），至少需要 3 句独立事件，请补充剧情后再生成。`
  }
  return null
}

function extractNamesInText(text: string): string[] {
  // 抽取中文人名：常见姓氏（百家姓前 60）开头 + 出现 ≥ 2 次（人名会被反复提到）+ 2-3 字
  const stop = new Set([
    '众人','路人','大家','他们','她们','它们','我们','你们','这帮','那帮','官兵','差役',
    '当时','当夜','今日','次日','翌日','最后','最终','于是','可是','但是','而是','并且',
    '而且','如果','虽然','因为','所以','不是','就是','还有','然而','这时','此时','此事',
    '此处','她对','他对','他们','她们','高烧三','她改名','猛地抬','猛地转','猛地回',
    '慢慢地','缓缓地','轻轻推','重重地','走过','跑到','冲进','跪在','倒在',
  ])
  const surname = new Set([
    '王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','胡','朱','高','林','何','郭',
    '马','罗','梁','宋','郑','谢','韩','唐','冯','于','董','萧','程','曹','袁','邓','许','傅',
    '沈','曾','彭','吕','苏','卢','蒋','蔡','贾','丁','魏','薛','叶','阎','余','潘','杜','戴',
    '夏','钟','汪','田','任','姜','范','方','石','姚','谭','廖','邹','熊','金','陆','郝','孔',
    '白','崔','康','毛','邱','秦','江','史','顾','侯','邵','孟','龙','万','段','雷','钱','汤',
    '尹','黎','易','常','武','乔','贺','赖','龚','文',
  ])
  const m = text.match(/[一-龥]{2,3}/g) || []
  const freq = new Map<string, number>()
  for (const w of m) freq.set(w, (freq.get(w) || 0) + 1)
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of m) {
    if (stop.has(w)) continue
    if (seen.has(w)) continue
    if (w.length === 3 && /[的地得了着过]$/.test(w)) continue
    if (w.length === 2 && /^[她他你我这那谁]/.test(w)) continue
    if (/[的了是在过与和跟把被让叫向从到给上下回]$/.test(w)) continue
    if (!surname.has(w[0])) continue
    if ((freq.get(w) || 0) < 2) continue
    seen.add(w)
    out.push(w)
    if (out.length >= 4) break
  }
  return out
}

/** 把剧本按事件顺序切成若干段；每段含 body（原文）+ tail（末句用作衔接锚点）+ title（章节名）
 *  注意：返回值长度 <= episodeCount，句数不足时不会用同一句充数（避免重复/无关剧情）。 */
function splitScriptForEpisodes(
  script: string,
  episodeCount: number,
): Array<{ body: string; tail: string; title?: string }> {
  const trimmed = script.trim()
  // units 用 {text, title} 结构，保证标题与句子始终对齐，过滤后索引不漂移
  const chapterTitleRegex = /^[【\[「《]\s*([^\]】」》]{2,20})\s*[】\]」》]\s*$/
  let units: Array<{ text: string; title?: string }> = trimmed
    .split(/\n+/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((u) => {
      const m = u.match(chapterTitleRegex)
      return { text: u, title: m ? m[1] : undefined }
    })
  if (units.length < episodeCount * 2) {
    units = trimmed
      .split(/(?<=[。！？!?])\s*/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 4)
      .map((u) => {
        const m = u.match(chapterTitleRegex)
        return { text: u, title: m ? m[1] : undefined }
      })
  }
  // 剔除"人物形象/设定"类句子（保留章节标题行，标题行本身不含剧情）
  units = units.filter((u) => !looksLikeAppearanceOrSetting(u.text))
  if (units.length === 0) return []

  const bucket = Math.max(1, Math.ceil(units.length / episodeCount))
  const out: Array<{ body: string; tail: string; title?: string }> = []
  for (let i = 0; i < episodeCount; i += 1) {
    const slice: string[] = []
    let sliceTitle: string | undefined
    for (let k = 0; k < bucket; k += 1) {
      const idx = i * bucket + k
      if (idx >= units.length) break
      const t = units[idx].title
      if (t) {
        sliceTitle = t
        continue
      }
      slice.push(units[idx].text)
    }
    if (slice.length === 0 && !sliceTitle) continue
    const body = slice.join(' ')
    const tail = (slice[slice.length - 1] ?? body).slice(-60)
    out.push({ body, tail, title: sliceTitle })
  }
  return out
}

export async function breakdownEpisodes(
  input: BuildEpisodesInput,
  userId = env.defaultUserId,
): Promise<EpisodeBreakdownResult> {
  const project = await loadProject(input.projectId)
  if (!project) throw new Error(`Project not found: ${input.projectId}`)

  const script = await resolveScript(project, input.screenplayId)

  // 输入质量预检：明显太短 / 无可用事件 / 乱码，直接报错让用户改输入
  // 比"硬拆 3 集然后乱编"友好得多，也避免 LLM 在空白上大量幻觉
  const qualityError = checkInputQuality(script)
  if (qualityError) {
    return {
      episodes: [],
      usedLlm: false,
      model: '',
      error: qualityError,
    }
  }
  const meta = project.productionMeta
  // 优先级：请求参数 > 立项 meta > 默认
  const baseCount = clamp(input.episodeCount ?? meta?.episodeCount ?? 6, 1, 120)
  const episodeDurationSec = clamp(input.episodeDurationSec ?? meta?.episodeDurationSec ?? 70, 30, 180)
  const shotsPerEpisode = input.shotsPerEpisode

  // 智能决定集数：按字数/事件密度决定。阈值放宽：剧本不应被死锁在 6 集。
  let effectiveCount = baseCount
  if (!input.episodeCount) {
    if (looksLikeNovel(script)) {
      const chapters = splitNovelIntoChapters(script)
      const { episodeCount: suggested } = suggestEpisodeCount(
        estimateEventCount(chapters),
        baseCount,
      )
      effectiveCount = suggested
    } else {
      // 短剧情也按内容密度：< 100 字 6 集；100-400 字 9 集；> 400 字 12 集。
      // 用户实际创意往往 200-600 字（不是 2000），所以阈值要放宽。
      const len = script.trim().length
      const sentences = script.split(/[。！？!?；;\n]/).filter((s) => s.trim().length > 4).length
      // 综合字数和句子数取较大值
      const density = Math.max(Math.floor(len / 80), sentences)
      // 封顶 16 集：长篇 21 集时分 11 批 LLM 太慢且易截断，限 16 集更可靠
      if (density >= 14) effectiveCount = 16
      else if (density >= 10) effectiveCount = 14
      else if (density >= 6) effectiveCount = 12
      else if (density >= 3) effectiveCount = 9
      else effectiveCount = Math.max(6, baseCount)
    }
  }
  const characters = await loadProjectCharacters(project)
  const characterNames = characters.map((c) => c.name).filter(Boolean)

  // 先切段：段数即最终集数（句数不足时少拆几集，不用同一句充数）
  const allSegments = splitScriptForEpisodes(script, effectiveCount).filter(
    (s) => s.body.trim().length > 0,
  )
  const segments = (
    allSegments.length > 0
      ? allSegments
      : [{ body: script.trim(), tail: script.trim().slice(-60) }]
  ).slice(0, Math.max(1, effectiveCount))

  // 分批调用 LLM：每批 BATCH_SIZE 集，控制单次输出长度避免 JSON 被截断，
  // 同时给足"每集 3 场景 + 2-3 句 action + 2-3 句对白"的内容预算。
  const llmEpisodes: Array<LlmEpisode | null> = new Array(segments.length).fill(null)
  let usedLlm = false
  let model = ''
  const errors: string[] = []
  let prevEnding = ''

  // 每段独立调用一次 LLM（而非 BATCH_SIZE=2 的批调用），原因：
  // 1) 单段体量小（≤1 段原文），maxTokens 2000 够用，几乎不截断
  // 2) 单段 prompt 只含本段内容 + 段外人名禁令，LLM 无法偷用其它段的人名/事件（消除"镜中映出""沈庭之身"这类幻觉）
  // 3) 一段失败不影响其它段（不用 8 批里有 3 批全废的灾难性场景）
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]
    const result = await completeJson<{ episodes: LlmEpisode[] }>({
      system: SYSTEM_PROMPT,
      user: buildBatchPrompt({
        script,
        segs: [{ body: seg.body, tail: seg.tail }],
        startIndex: i,
        prevEnding,
        characterNames,
        durationSec: episodeDurationSec,
      }),
      temperature: 0.5,
      maxTokens: 3200,
      fallback: () => ({ episodes: [] }),
    })

    if (result.data?.episodes?.length) {
      usedLlm = usedLlm || result.usedLlm
      model = result.model
      const ep = result.data.episodes[0]
      if (ep) {
        ep.index = i + 1
        llmEpisodes[i] = ep
        prevEnding = extractEnding(ep)
      } else {
        errors.push(`第 ${i + 1} 集：${result.error ?? 'LLM 无返回'}`)
      }
    } else {
      errors.push(`第 ${i + 1} 集：${result.error ?? 'LLM 无返回'}`)
    }
  }

  // 归一化：优先用 LLM 结果；缺失或空场景的单集用确定性兜底（不影响其它集）
  const rawEpisodes: RawEpisode[] = segments.map((seg, i) => {
    const e = llmEpisodes[i]
    if (e) {
      const r = toRawEpisode(e, i + 1, episodeDurationSec)
      if (r.scriptBody.scenes.length > 0) return r
    }
    return fallbackForSegment(seg, i, episodeDurationSec, characterNames)
  })

  const episodes = rawEpisodes.map((r, i) =>
    finalizeEpisode(r, i + 1, project, episodeDurationSec, characters, shotsPerEpisode),
  )
  await persistEpisodes(episodes, userId)
  return {
    episodes,
    usedLlm,
    model,
    error: errors.length > 0 ? errors.join('；') : undefined,
  }
}

/** 取一集的结尾文本（最后一 scene 的 action 末句），用作下一批的衔接锚点 */
function extractEnding(e: LlmEpisode): string {
  const scenes = e.script?.scenes ?? []
  const last = scenes[scenes.length - 1]
  const text = (last?.action ?? e.synopsis ?? e.script?.summary ?? '').trim()
  return text.slice(-80)
}

/** LLM 原始返回的单集结构 */
interface LlmEpisode {
  index?: number
  title?: string
  synopsis?: string
  beats?: Array<{ summary: string; emotion: string }>
  script?: {
    summary?: string
    scenes?: Array<{
      location?: string
      timeOfDay?: string
      action?: string
      dialogues?: Array<{ name?: string; line?: string; emotion?: string }>
    }>
    characterNames?: string[]
    props?: string[]
  }
}

/** 归一化后的单集（含剧本内容 scriptBody） */
interface RawEpisode {
  index: number
  title: string
  synopsis: string
  beats: Array<{ summary: string; emotion: string }>
  scriptBody: EpisodeScriptBody
}

const TIME_CYCLE = ['day', 'night', 'dawn', 'dusk'] as const

function normalizeTimeOfDay(value?: string): EpisodeScriptBody['scenes'][number]['timeOfDay'] {
  const v = (value ?? '').toLowerCase()
  if (v.includes('night') || v.includes('夜')) return 'night'
  if (v.includes('dawn') || v.includes('黎') || v.includes('拂晓') || v.includes('晨')) return 'dawn'
  if (v.includes('dusk') || v.includes('黄昏') || v.includes('暮') || v.includes('傍')) return 'dusk'
  return 'day'
}

/** 把 LLM 单集结果归一化为 RawEpisode（补全 id / 时间 / 缺省） */
function toRawEpisode(e: LlmEpisode, epIndex: number, durationSec: number): RawEpisode {
  const script = e.script
  const rawScenes = script?.scenes ?? []
  const scenes =
    rawScenes.length > 0
      ? rawScenes.map((s, si) => ({
          id: `sc${epIndex}-${si + 1}`,
          location: s.location?.trim() || '主场景',
          timeOfDay: normalizeTimeOfDay(s.timeOfDay),
          action: s.action?.trim() || '',
          _ai: 'llm' as const,
          dialogues: (s.dialogues ?? []).map((d, di) => ({
            id: `d${epIndex}-${si + 1}-${di + 1}`,
            characterName: d.name?.trim() || '角色',
            // 完整保留对白，不做长度截断；仅去掉首尾空白
            line: (d.line ?? '').trim(),
            emotion: d.emotion?.trim() || undefined,
            _ai: 'llm' as const,
          })),
        }))
      : [
          {
            id: `sc${epIndex}-1`,
            location: '主场景',
            timeOfDay: 'day' as const,
            action: e.synopsis?.trim() || `第 ${epIndex} 集：${e.title?.trim() ?? ''}`,
            _ai: 'llm' as const,
            dialogues: [],
          },
        ]
  const scriptBody: EpisodeScriptBody = {
    summary: script?.summary?.trim() || e.synopsis?.trim() || `第 ${epIndex} 集`,
    scenes,
    characterNames: script?.characterNames ?? [],
    props: script?.props ?? [],
    durationSec,
  }
  // Strip "第 N 集" if the model ignored the title rule — UI adds the prefix.
  const rawTitle = e.title?.trim() || ''
  const title =
    rawTitle
      .replace(new RegExp(`^第\\s*${epIndex}\\s*集\\s*[·•\\-—]?\\s*`), '')
      .replace(/^第\s*\d+\s*集\s*[·•\-—]?\s*/, '')
      .trim() || `第 ${epIndex} 集`
  return {
    index: epIndex,
    title,
    synopsis: e.synopsis?.trim() || scriptBody.summary,
    beats: (e.beats ?? []).map((b) => ({ summary: b.summary, emotion: b.emotion })),
    scriptBody,
  }
}

/** 把剧本内容拼成一段连续文本，作为分镜切分的真实输入（保证每集不同） */
function scriptToText(script: EpisodeScriptBody): string {
  const parts: string[] = []
  for (const scene of script.scenes) {
    if (scene.action) parts.push(scene.action)
    for (const d of scene.dialogues) {
      if (d.line) parts.push(`${d.characterName}：${d.line}`)
    }
  }
  return parts.join('。')
}

const FALLBACK_BEATS = [
  { summary: '开篇强冲突', emotion: 'shock' },
  { summary: '中段推进', emotion: 'tense' },
  { summary: '收尾留钩', emotion: 'curious' },
]

/** 单段兜底：把段内的真实事件句拆成 3 个场景（起承转合），每个场景 2-3 句 action + 1 句对白。
 *  - 严格过滤外貌/设定/镜中映照类句子
 *  - 对白名只从本段出现的人名里挑
 *  - 标题用段内首句前 6 字（无章节标题时） */
function fallbackForSegment(
  seg: { body: string; tail: string; title?: string },
  i: number,
  _durationSec: number,
  characterNames: string[] = [],
): RawEpisode {
  const raw = (seg?.body || `第 ${i + 1} 段剧情展开。`).trim()
  // 过滤掉"外貌/设定"类句子
  const sentences = raw
    .split(/(?<=[。！？!?；;])\s*/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !looksLikeAppearanceOrSetting(s))
  // 本段实际出现的人名（用作 dialogues.name 的来源）
  const names = extractNamesInText(raw)
  const defaultName = names[0] || characterNames[0] || '她'

  // 把事件句拆成 3 段（起承转合），不足 3 句时复用末句，3 句都不够时拼成 1 段
  const chunks: string[] = []
  if (sentences.length === 0) {
    chunks.push(raw.trim() || '剧情推进。')
  } else if (sentences.length <= 3) {
    for (const s of sentences) chunks.push(s)
  } else {
    const third = Math.ceil(sentences.length / 3)
    chunks.push(sentences.slice(0, third).join(''))
    chunks.push(sentences.slice(third, third * 2).join(''))
    chunks.push(sentences.slice(third * 2).join(''))
  }
  // 凑够 3 个场景
  while (chunks.length < 3) chunks.push(chunks[chunks.length - 1] || '剧情推进。')

  const scenes = chunks.slice(0, 3).map((actionText, si) => {
    const isLast = si === 2
    const action = isLast ? `${actionText}（留悬念引出下集）` : actionText
    const emotion = si === 2 ? 'tense' : 'neutral'
    // 优先抽取原文引号对白；没有则用完整首句作旁白式台词（禁止硬截字符）。
    const dialogues = buildFallbackDialogues(
      actionText,
      defaultName,
      emotion,
      `d${i + 1}-${si + 1}`,
    )
    return {
      id: `sc${i + 1}-${si + 1}`,
      location: si === 0 ? '主场景' : si === 1 ? '次要场景' : '收尾场景',
      timeOfDay: TIME_CYCLE[(i + si) % 4],
      action,
      _ai: 'fallback' as const,
      dialogues,
    }
  })

  // 兜底标题：优先用原文【章节名】；否则从正文首句提取前 6 个非标点字作标题。
  // 不写「第 N 集」前缀——审查页 UI 会统一加。
  const derivedTitle = raw.replace(/[\s，。、；：！？!?""''（）()【】\[\]]/g, '').slice(0, 6) || '剧情推进'
  // 梗概/摘要取完整句子拼接，只在句边界截断，避免半句尾巴。
  const synopsis = clipAtSentence(sentences.slice(0, 3).join('') || raw, 220)
  const summary = clipAtSentence(sentences.slice(0, 4).join('') || raw, 280)
  return {
    index: i + 1,
    title: seg?.title?.trim() || derivedTitle,
    synopsis,
    beats: FALLBACK_BEATS,
    scriptBody: {
      summary,
      scenes,
      characterNames: names.length > 0 ? names : [...characterNames],
      props: [],
      durationSec: _durationSec,
    },
  } as RawEpisode
}

/** 在句号边界附近截断，绝不从句子中间砍断。 */
function clipAtSentence(text: string, maxLen: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  const window = trimmed.slice(0, maxLen)
  const cut = Math.max(
    window.lastIndexOf('。'),
    window.lastIndexOf('！'),
    window.lastIndexOf('？'),
    window.lastIndexOf('；'),
  )
  if (cut >= Math.floor(maxLen * 0.4)) return window.slice(0, cut + 1)
  return `${window.replace(/[，、,\s]+$/u, '')}…`
}

/**
 * 兜底对白：
 * 1) 从原文抽「」"" 引号对白（完整保留，不截断）
 * 2) 否则用完整首句作旁白式台词（不硬截 24/120 字）
 */
function buildFallbackDialogues(
  actionText: string,
  defaultName: string,
  emotion: string,
  idPrefix: string,
): Array<{
  id: string
  characterName: string
  line: string
  emotion: string
  _ai: 'fallback'
}> {
  const quoted = extractQuotedLines(actionText)
  if (quoted.length > 0) {
    return quoted.slice(0, 3).map((q, di) => ({
      id: `${idPrefix}-${di + 1}`,
      characterName: q.name || defaultName,
      line: q.line,
      emotion,
      _ai: 'fallback' as const,
    }))
  }

  const firstSentence =
    actionText.match(/^[\s\S]*?[。！？!?]/)?.[0]?.trim() || actionText.trim()
  const line = firstSentence.replace(/[。！？!?]+$/u, '').trim()
  if (!line) return []
  // 叙述句不当作角色口播：标为旁白，避免「她：她烧得…」式半截/第三人称对白错觉
  return [
    {
      id: `${idPrefix}-1`,
      characterName: '旁白',
      line,
      emotion,
      _ai: 'fallback' as const,
    },
  ]
}

/** 抽取「角色：台词」或引号台词；保留完整字符串，不做长度截断。 */
function extractQuotedLines(text: string): Array<{ name?: string; line: string }> {
  const out: Array<{ name?: string; line: string }> = []
  const named = /([一-龥A-Za-z]{1,8})\s*[：:]\s*[「『"“]([^」』"”]+)[」』"”]/gu
  for (const m of text.matchAll(named)) {
    const line = m[2]?.trim()
    if (line) out.push({ name: m[1], line })
  }
  if (out.length > 0) return out

  const bare = /[「『"“]([^」』"”]{2,})[」』"”]/gu
  for (const m of text.matchAll(bare)) {
    const line = m[1]?.trim()
    if (line) out.push({ line })
  }
  return out
}

/** 兜底：把剧本按段切成多集，逐段调用 fallbackForSegment */
function fallbackBreakdown(
  script: string,
  episodeCount: number,
  durationSec: number,
  characterNames: string[] = [],
): RawEpisode[] {
  const segments = splitScriptForEpisodes(script, episodeCount)
  const segs = segments.length > 0 ? segments : [{ body: script.trim(), tail: '' }]
  return segs.map((seg, i) => fallbackForSegment(seg, i, durationSec, characterNames))
}

/** 粗判一句话是否是"外貌/服装/五官/身高/设定/性格"类描述（不写到 action 里） */
function looksLikeAppearanceOrSetting(sentence: string): boolean {
  const patterns = [
    /^[（(]?(外貌|形象|设定|简介|背景|角色|性格)/i,
    /身高|体型|皮肤|头发|眼睛|双眸|面容|五官|长相|穿着|服装|服饰|衣裳|气度|气质/,
    /纤细|白皙|单薄|高大|威武|清秀|魁梧|婀娜|貌美|俊美|花容|玉貌|亭亭/,
  ]
  return patterns.some((re) => re.test(sentence))
}

// ---------------------------------------------------------------------------
// 片段拆分（小说感知）
// ---------------------------------------------------------------------------

/** 把长文本切成 episodeCount 个片段；若为小说则按章节结构聚合，避免切碎情节 */
function splitIntoSegments(text: string, episodeCount: number): string[] {
  const trimmed = text.trim()
  if (looksLikeNovel(trimmed)) {
    const chapters = splitNovelIntoChapters(trimmed)
    return groupChaptersIntoEpisodes(chapters, episodeCount)
  }

  const paragraphs = trimmed
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length <= episodeCount) {
    const out: string[] = []
    for (let i = 0; i < episodeCount; i += 1) out.push(paragraphs[i] ?? trimmed)
    return out
  }

  const per = Math.ceil(paragraphs.length / episodeCount)
  const out: string[] = []
  for (let i = 0; i < episodeCount; i += 1) {
    const slice = paragraphs.slice(i * per, (i + 1) * per)
    out.push(slice.join('\n'))
  }
  return out
}

/** 把章节均匀分桶成 episodeCount 集（novelcut：事件/2.5 已决定集数） */
function groupChaptersIntoEpisodes(chapters: ReturnType<typeof splitNovelIntoChapters>, episodeCount: number): string[] {
  if (chapters.length === 0) return ['']
  if (chapters.length <= episodeCount) {
    return Array.from({ length: episodeCount }, (_, i) => chapters[i]?.text ?? '')
  }
  const bucketSize = Math.ceil(chapters.length / episodeCount)
  const out: string[] = []
  for (let i = 0; i < episodeCount; i += 1) {
    const slice = chapters.slice(i * bucketSize, (i + 1) * bucketSize)
    out.push(slice.map((c) => c.text).join('\n'))
  }
  return out
}

/**
 * Resolve the full user script used for episode breakdown.
 * Prefer screenplay.rawScript (Postgres or memory via getScreenplay);
 * fall back to project.idea only when no screenplay text exists.
 */
async function resolveScript(project: Project, screenplayId?: string): Promise<string> {
  const candidates = [screenplayId, project.screenplayId].filter(
    (value): value is string => Boolean(value),
  )
  for (const id of candidates) {
    const screenplay = await getScreenplay(id)
    const raw = screenplay?.rawScript?.trim()
    if (raw) return raw
  }
  return project.idea
}

/** 从文本粗判题材（用于阶段1卡点策略选择） */
function detectGenre(text: string): DramaGenre {
  const t = text.slice(0, 500)
  const map: Array<[DramaGenre, RegExp]> = [
    ['sweet', /(甜|恋爱|宠|心动|初恋)/],
    ['overlord', /(战神|废物|逆袭|打脸|最强)/],
    ['ceo', /(总裁|霸总|集团|亿万|联姻)/],
    ['rebirth', /(重生|再来一次|重活|回到)/],
    ['suspense', /(凶案|谜|悬疑|杀人|失踪|真相)/],
    ['comedy', /(搞笑|喜剧|社死|乌龙|爆笑)/],
    ['xianxia', /(修仙|灵气|宗门|渡劫|飞升|秘境)/],
    ['isekai', /(穿越|异世界|系统|重生到)/],
    ['family', /(父母|家庭|亲情|孩子|养老)/],
  ]
  for (const [g, re] of map) if (re.test(t)) return g
  return 'other'
}

// ---------------------------------------------------------------------------
// 单集组装 + 分镜（确定性决策引擎驱动）
// ---------------------------------------------------------------------------

function finalizeEpisode(
  raw: RawEpisode,
  episodeIndex: number,
  project: Project,
  episodeDurationSec: number,
  characters: CharacterAsset[],
  shotsPerEpisode?: number,
): Episode {
  // 分镜的真实来源是「该集 scriptBody.scenes」，每个 scene 拆出 2-3 镜，
  // 每镜 action 取自该场 action 文本 + 该场对白。这样剧本内容不同 → 分镜表自然不同。
  const sceneShots = buildSceneShots(raw.scriptBody)
  const shotCount =
    shotsPerEpisode ??
    clamp(sceneShots.length > 0 ? sceneShots.length : Math.round(episodeDurationSec / 6) || 10,
      6,
      18)
  // 仍走 buildShots 决策引擎（景别/运镜/角度/卡点），但把每镜「具体动作」喂进去
  const episodeText = sceneShots.map((s) => s.action).join('。')
  const { shots, hookShots } = buildShots({
    episodeIndex,
    episodeText,
    shotCount: sceneShots.length || shotCount,
    episodeDurationSec,
    project,
    characters,
    shotsPerEpisode,
  })
  // 把 sceneShots 的具体动作 + 对白覆盖到 shot 上（完整保留，不截断）
  for (let i = 0; i < shots.length; i += 1) {
    const src = sceneShots[i]
    if (!src) continue
    shots[i].action = src.action || shots[i].action
    shots[i].dialogue = src.dialogue
  }

  const stamp = nowIso()
  return {
    id: id('ep'),
    projectId: project.id,
    userId: project.userId,
    screenplayId: project.screenplayId,
    index: raw.index,
    title: raw.title,
    synopsis: raw.synopsis,
    durationSec: episodeDurationSec,
    beats: raw.beats.map((b, i) => ({
      id: `b${episodeIndex}-${i}`,
      act: (i < raw.beats.length / 3 ? 1 : i < (raw.beats.length * 2) / 3 ? 2 : 3) as 1 | 2 | 3,
      summary: b.summary,
      emotion: b.emotion,
    })),
    scenes: [],
    scriptBody: raw.scriptBody,
    shots,
    hookShots,
    status: 'storyboarded',
    updatedAt: stamp,
  }
}

/** 把一集 scriptBody 拆成「每镜的具体动作 + 对白」列表。
 *  每个 scene 拆 2-3 镜：第一镜是动作起手，末镜是对白/收尾，保证每集内容不同。 */
function buildSceneShots(script: EpisodeScriptBody): Array<{
  action: string
  dialogue: Array<{ characterName: string; line: string; emotion?: string }>
}> {
  const out: Array<{
    action: string
    dialogue: Array<{ characterName: string; line: string; emotion?: string }>
  }> = []
  const scenes = script.scenes ?? []
  if (scenes.length === 0) return out

  for (const scene of scenes) {
    const sentences = (scene.action ?? '')
      .split(/[。！？!?；;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const dialogues = scene.dialogues ?? []

    if (sentences.length === 0 && dialogues.length === 0) continue
    if (sentences.length === 0) {
      // 只有对白：每个对白一镜
      for (const d of dialogues) {
        out.push({ action: `${scene.location || '主场景'}: ${d.characterName}说话`, dialogue: [d] })
      }
      continue
    }

    if (sentences.length === 1) {
      // 一句动作 + 全部对白，2 镜
      out.push({ action: sentences[0], dialogue: dialogues.slice(0, 1) })
      if (dialogues.length > 1) {
        out.push({
          action: `${sentences[0]}（续）`,
          dialogue: dialogues.slice(1),
        })
      } else {
        out.push({ action: `${sentences[0]}（场景收尾）`, dialogue: [] })
      }
      continue
    }

    // 多句动作：按"前段/中段/末段"均分
    const mid = Math.max(1, Math.floor(sentences.length / 2))
    const last = sentences.length - 1
    out.push({ action: sentences.slice(0, mid).join('，'), dialogue: dialogues.slice(0, 1) })
    if (last > mid) {
      out.push({
        action: sentences.slice(mid, last + 1).join('，'),
        dialogue: dialogues.slice(1, Math.max(2, dialogues.length - 1)),
      })
    } else {
      out.push({ action: sentences[mid], dialogue: dialogues.slice(1) })
    }
    if (dialogues.length > 0) {
      out.push({ action: '对白交锋', dialogue: dialogues.slice(-1) })
    }
  }

  // 钳到 6-18 镜
  return out.slice(0, 18)
}

interface BuildShotsInput {
  episodeIndex: number
  episodeText: string
  shotCount: number
  episodeDurationSec: number
  project: Project
  characters: CharacterAsset[]
  shotsPerEpisode?: number
}

/** 用确定性决策引擎产出每镜的景别/角度/运镜/时长，并接好首尾帧链与衔接锚点 */
function buildShots(input: BuildShotsInput): {
  shots: ShotSpec[]
  hookShots: Partial<Record<HookType, string>>
} {
  const { episodeText, shotCount, episodeDurationSec, project, characters } = input
  const rhythm = buildRhythmSegments(episodeDurationSec)
  const recurringTimes = recurringHookTimes(episodeDurationSec, 12, rhythm)
  const segments = splitEpisodeText(episodeText, shotCount)

  const perShot = clamp(Math.round(episodeDurationSec / shotCount), 3, 12)
  const shots: ShotSpec[] = []
  const hookShots: Partial<Record<HookType, string>> = {}

  for (let i = 0; i < shotCount; i += 1) {
    const startSec = i * perShot
    const isLast = i === shotCount - 1
    const hook = hookTypeAt(startSec, rhythm, recurringTimes) ?? (i === 0 ? 'gold_3s' : undefined)
    if (hook && !hookShots[hook]) hookShots[hook] = `shot-${input.episodeIndex}-${i + 1}`

    const emotion = guessEmotion(segments[i] ?? '')
    const features = deriveFeatures(i, shotCount, hook, emotion, characters.length > 0)
    const decision = decideShot(features)

    const shotId = `shot-${input.episodeIndex}-${i + 1}`
    const duration = isLast ? Math.max(perShot, episodeDurationSec - startSec) : perShot

    const characterIds =
      features.focus === 'character' && characters.length > 0
        ? [characters[i % characters.length].id]
        : []

    const chain = buildFrameChain(i, shotCount, segments[i] ?? '', hook)

    const shot: ShotSpec = {
      id: shotId,
      index: i + 1,
      sceneId: `${project.id}-scene`,
      title: `镜 ${i + 1}`,
      durationSec: duration,
      camera: {
        size: decision.size,
        move: decision.move,
        angle: decision.angle,
      },
      characterIds,
      action: segments[i] ?? '',
      dialogue: [],
      emotion,
      visualPrompt: '',
      hookType: hook,
      frameChain: chain,
      qa: { frameLinkable: true },
    }
    shots.push(shot)
  }

  // 衔接锚点（具体物理现象，不引用"上一镜"）
  for (let i = 1; i < shots.length; i += 1) {
    const t = shots[i].frameChain?.transition ?? 'cut'
    shots[i].frameChain = {
      ...shots[i].frameChain,
      connection:
        t === 'match_cut'
          ? '同机位同角色位置，动作沿同一动势连续，匹配转场无缝'
          : t === 'dissolve'
            ? '光色与构图延续，叠化过渡不跳切'
            : '视线与动作落点衔接，硬切保持在 180° 轴线内',
    }
  }

  // 预渲染提示词（无视觉资产时仅用文本，角色以 @名称 冻结）
  const ctx: PromptContext = { characters: characters.length > 0 ? characters : undefined }
  for (const shot of shots) {
    const tpl = buildPromptTemplate(shot, ctx)
    shot.visualPrompt = tpl.imagePrompt
    shot.videoPrompt = tpl.videoPrompt
    shot.negativePrompt = tpl.negative
  }

  // 强制卡点覆盖：一卡黄金3秒在首镜、片尾钩子在尾镜、三卡反转铺垫兜底到中后段，
  // 否则质量门永远报"缺片尾钩子"导致流水线 qa_review 不通过
  ensureHookCoverage(shots, hookShots)

  return { shots, hookShots }
}

/** 保证四级卡点中强制项一定落到镜头上（首镜=黄金3秒，尾镜=片尾钩子，中后段=反转铺垫） */
function ensureHookCoverage(
  shots: ShotSpec[],
  hookShots: Partial<Record<HookType, string>>,
): void {
  if (shots.length === 0) return
  if (!hookShots.gold_3s) {
    const first = shots[0]
    first.hookType = 'gold_3s'
    hookShots.gold_3s = first.id
  }
  if (!hookShots.tail) {
    const last = shots[shots.length - 1]
    last.hookType = 'tail'
    hookShots.tail = last.id
  }
  if (!hookShots.climax_50s) {
    const idx = Math.max(1, Math.min(shots.length - 2, Math.floor(shots.length * 0.7)))
    const mid = shots[idx]
    mid.hookType = 'climax_50s'
    hookShots.climax_50s = mid.id
  }
}

/** 六维特征 → 决策引擎输入 */
function deriveFeatures(
  i: number,
  shotCount: number,
  hook: HookType | undefined,
  emotion: EmotionTone,
  hasCharacters: boolean,
): ShotFeatures {
  const contentType =
    i === 0 ? 'reveal' : hook === 'tail' ? 'transition' : hook === 'climax_50s' || hook === 'core_10s' ? 'action' : 'dialogue'
  const focus = hasCharacters ? 'character' : 'environment'
  const power =
    hook === 'climax_50s' || hook === 'gold_3s' ? 'dominant' : i % 3 === 0 ? 'submissive' : 'equal'
  const space = i === 0 || hook === 'gold_3s' ? 'wide' : 'intimate'
  const pacing = hook === 'tail' || hook === 'climax_50s' ? 'fast' : i === shotCount - 1 ? 'slow' : 'medium'

  return { contentType, focus, emotion, power, space, pacing }
}

function guessEmotion(text: string): EmotionTone {
  if (/(杀|死|战|败|复仇|背叛|揭露|反转|绝境|危机|逆袭)/.test(text)) return 'shock'
  if (/(怒|恨|怕|紧张|威胁|逼|欺)/.test(text)) return 'tense'
  if (/(爱|甜|笑|喜|温柔|治愈|心动)/.test(text)) return 'warm'
  if (/(疑|探|秘|奇|迷)/.test(text)) return 'curious'
  if (/(哭|悲|伤|寂|失|落)/.test(text)) return 'sad'
  if (/(乐|开心|幸福|甜)/.test(text)) return 'joy'
  return 'neutral'
}

function splitEpisodeText(text: string, shotCount: number): string[] {
  const sentences = text
    .split(/[。！？!?；;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length === 0) return new Array(shotCount).fill('')
  // 每镜切走不同子句，且不重复：轮询 sentences，避免缺句 fallback 到同一段文本
  const out: string[] = []
  for (let i = 0; i < shotCount; i += 1) {
    out.push(sentences[i] ?? '')
  }
  return out
}

function buildFrameChain(i: number, shotCount: number, text: string, _hook?: HookType) {
  const startFrame = `${text.slice(0, 24)}，主体清晰居中`
  const endFrame = i === shotCount - 1 ? `${text.slice(-24)}，定格留悬念` : `${text.slice(0, 24)}，动势延续`
  const transition: 'cut' | 'dissolve' | 'match_cut' | undefined =
    i === 0 ? undefined : i % 2 === 0 ? 'match_cut' : 'cut'
  return {
    startFrameDescription: startFrame,
    endFrameDescription: endFrame,
    transition,
  }
}

// ---------------------------------------------------------------------------
// 提示词刷新（注入视觉锚点）
// ---------------------------------------------------------------------------

export async function refreshEpisodePrompts(
  projectId: string,
  ctx: PromptContext,
  _userId = env.defaultUserId,
): Promise<number> {
  const episodes = await listEpisodes(projectId)
  let count = 0
  for (const episode of episodes) {
    for (const shot of episode.shots) {
      const tpl = buildPromptTemplate(shot, ctx)
      shot.visualPrompt = tpl.imagePrompt
      shot.videoPrompt = tpl.videoPrompt
      shot.negativePrompt = tpl.negative
      count += 1
    }
    await saveEpisode(episode)
  }
  return count
}

// ---------------------------------------------------------------------------
// 质量门（video-prompt-engineer 硬约束 + storyboard-master 九要素）
// ---------------------------------------------------------------------------

export async function runQualityGate(
  projectId: string,
  _userId = env.defaultUserId,
): Promise<QualityGateReportData> {
  const episodes = await listEpisodes(projectId)
  const issues: string[] = []
  const hookCoverage: Partial<Record<HookType, number>> = {}

  let shotCount = 0
  let renderedShots = 0
  let framedShots = 0
  const seenDialogue = new Map<string, number>()

  for (const ep of episodes) {
    for (const shot of ep.shots) {
      shotCount += 1
      if (shot.clipUrl) renderedShots += 1
      if (shot.frameChain?.startFrameDescription) framedShots += 1
      if (shot.hookType) hookCoverage[shot.hookType] = (hookCoverage[shot.hookType] ?? 0) + 1

      // 九要素帧级检测：景别/运镜/光线/首尾帧/角色锚定/动作/场景/情绪/负面词
      const p = shot.visualPrompt || ''
      if (!/镜头[:：]/.test(p)) issues.push(`${ep.title} 镜${shot.index} 缺失景别/运镜参数`)
      if (!/光线[:：]/.test(p)) issues.push(`${ep.title} 镜${shot.index} 缺失光线描述`)
      if (!shot.action) issues.push(`${ep.title} 镜${shot.index} 缺失动作描述`)

      // 独立可执行：禁止"上一镜"等关系指代
      if (/(上一镜|刚才|之前|前一场|上一段)/.test(shot.videoPrompt ?? '')) {
        issues.push(`${ep.title} 镜${shot.index} 视频提示词含关系指代，违反独立可执行`)
      }

      // 单焦点：视觉焦点角色不超过 3
      if (shot.characterIds.length > 3) {
        issues.push(`${ep.title} 镜${shot.index} 视觉焦点角色过多（>3）`)
      }

      // 音频账本：台词恰好出现一次
      for (const d of shot.dialogue ?? []) {
        const key = `${ep.index}:${d.text}`
        seenDialogue.set(key, (seenDialogue.get(key) ?? 0) + 1)
      }
    }
  }

  for (const [line, n] of seenDialogue) {
    if (n > 1) issues.push(`台词重复出现 ${n} 次：${line}`)
  }

  // 强制卡点覆盖
  if (!hookCoverage.gold_3s) issues.push('缺少「一卡·黄金3秒」卡点镜头')
  if (!hookCoverage.tail) issues.push('缺少「片尾钩子」卡点镜头')

  return {
    episodeCount: episodes.length,
    shotCount,
    renderedShots,
    framedShots,
    hookCoverage,
    issues,
    passed: issues.length === 0,
  }
}

// ---------------------------------------------------------------------------
// 持久化 / 读取
// ---------------------------------------------------------------------------

export async function listEpisodes(projectId: string): Promise<Episode[]> {
  if (env.storageDriver === 'postgres') {
    const { listEpisodesPg } = await import('../repositories/episodeRepo.js')
    return listEpisodesPg(projectId)
  }
  return [...db.episodes.values()]
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => a.index - b.index)
}

export async function getEpisode(episodeId: string): Promise<Episode | undefined> {
  if (env.storageDriver === 'postgres') {
    const { getEpisodePg } = await import('../repositories/episodeRepo.js')
    return getEpisodePg(episodeId)
  }
  return db.episodes.get(episodeId)
}

async function saveEpisode(episode: Episode, userId = env.defaultUserId): Promise<void> {
  if (env.storageDriver === 'postgres') {
    // 委托给 repositories/episodes 里已经按 (projectId, index) 正确 upsert 的实现，
    // 避免 services 里自己写一份列名映射（之前 episodeToRow 用 camelCase 直接 500）。
    const { saveEpisodesPg } = await import('../repositories/episodeRepo.js')
    const ownerId = episode.userId || userId || env.defaultUserId
    await saveEpisodesPg([{ ...episode, userId: ownerId }], ownerId)
    return
  }
  db.episodes.set(episode.id, episode)
}

async function deleteEpisodesByProject(projectId: string): Promise<void> {
  if (env.storageDriver === 'postgres') {
    const { deleteEpisodesByProjectPg } = await import('../repositories/episodeRepo.js')
    await deleteEpisodesByProjectPg(projectId)
    return
  }
  for (const [key, value] of db.episodes) {
    if (value.projectId === projectId) db.episodes.delete(key)
  }
}

/** 保存分集：先清掉该项目旧分集，再写入（支持"重新拆解"覆盖，避免重复） */
async function persistEpisodes(episodes: Episode[], userId: string): Promise<void> {
  if (episodes.length === 0) return
  const projectId = episodes[0].projectId
  await deleteEpisodesByProject(projectId)
  for (const ep of episodes) await saveEpisode(ep, userId)
}

async function loadProjectCharacters(project: Project): Promise<CharacterAsset[]> {
  const { getCharacter } = await import('./assetMemory.js')
  const out: CharacterAsset[] = []
  for (const cid of project.characterIds) {
    const c = await getCharacter(cid)
    if (c) out.push(c)
  }
  return out
}

/** 审查剧本后保存单集修改（标题 / 梗概） */
export async function updateEpisode(
  episodeId: string,
  patch: Partial<Pick<Episode, 'title' | 'synopsis' | 'index'>>,
): Promise<Episode> {
  const ep = await getEpisode(episodeId)
  if (!ep) throw new Error(`Episode not found: ${episodeId}`)
  if (patch.title !== undefined) ep.title = patch.title
  if (patch.synopsis !== undefined) ep.synopsis = patch.synopsis
  if (patch.index !== undefined) ep.index = patch.index
  ep.updatedAt = nowIso()
  await saveEpisode(ep)
  return ep
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
