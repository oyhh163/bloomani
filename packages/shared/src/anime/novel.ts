/**
 * 小说切片与事件抽取（novelcut 风格的多层级语义管线）。
 *
 * 物理/标记层：正则识别 10+ 种章节标记，无标记则按字数兜底。
 * 剧情重组层：事件数 / 2.5 ≈ 建议集数（>5 集按批生成避免超时）。
 * 事件层：逐章抽取 3–7 结构化事件（summary / characters / locations / beat / excerpt）。
 */

/** 10+ 种章节标记（中英文变体）。注意：JS 的 \b 只对 ASCII 有效，中文处不加 \b。 */
const CHAPTER_PATTERNS: RegExp[] = [
  /^\s*第[零一二三四五六七八九十百千0-9]+章(?:\s|[：:，,。！!?]|$)/m,
  /^\s*Chapter\s+\d+/mi,
  /^\s*CHAPTER\s+\d+/mi,
  /^\s*序章(?:\s|[：:，,。！!?]|$)/m,
  /^\s*楔子(?:\s|[：:，,。！!?]|$)/m,
  /^\s*前言(?:\s|[：:，,。！!?]|$)/m,
  /^\s*后记(?:\s|[：:，,。！!?]|$)/m,
  /^\s*番外(?:\s|[：:，,。！!?]|$)/m,
  /^\s*第[零一二三四五六七八九十百千0-9]+卷(?:\s|[：:，,。！!?]|$)/m,
  /^\s*卷[一二三四五六七八九十0-9]+(?:\s|[：:，,。！!?]|$)/m,
  /^\s*第[零一二三四五六七八九十百千0-9]+回(?:\s|[：:，,。！!?]|$)/m,
  /^\s*【第[零一二三四五六七八九十百千0-9]+章】/m,
]

export interface NovelChapter {
  index: number
  title: string
  text: string
}

export interface NovelEvent {
  index: number
  chapterIndex: number
  summary: string
  characters: string[]
  locations: string[]
  /** 节拍强度 1–10（冲突/反转越强越高） */
  beat: number
  excerpt: string
}

/**
 * 把长文本切成章节。优先按标记切；无标记时按段落累计字数切（档位 3000/1500）。
 */
export function splitNovelIntoChapters(text: string): NovelChapter[] {
  const raw = text.replace(/\r\n/g, '\n').trim()
  if (!raw) return []

  const lines = raw.split('\n')
  const boundaries: number[] = []
  const titles: string[] = []

  lines.forEach((line, i) => {
    const matched = CHAPTER_PATTERNS.some((re) => re.test(line))
    if (matched) {
      boundaries.push(i)
      titles.push(line.trim().replace(/[#*]/g, '').trim())
    }
  })

  if (boundaries.length >= 2) {
    const chapters: NovelChapter[] = []
    for (let b = 0; b < boundaries.length; b += 1) {
      const start = boundaries[b]
      const end = b + 1 < boundaries.length ? boundaries[b + 1] : lines.length
      const body = lines.slice(start, end).join('\n').trim()
      chapters.push({
        index: b + 1,
        title: titles[b] || `第 ${b + 1} 章`,
        text: body,
      })
    }
    return chapters
  }

  // 无标记 fallback：按字数档切（3000/1500）
  return splitBySize(raw)
}

function splitBySize(raw: string): NovelChapter[] {
  const threshold = raw.length > 60000 ? 3000 : 1500
  const chunks: string[] = []
  let current = ''
  for (const para of raw.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean)) {
    if (current.length + para.length > threshold && current.length > 0) {
      chunks.push(current)
      current = ''
    }
    current += (current ? '\n' : '') + para
  }
  if (current) chunks.push(current)

  return chunks.map((text, i) => ({
    index: i + 1,
    title: `第 ${i + 1} 段`,
    text,
  }))
}

/** 是否为"像小说"的长文本（有章节结构或字数超阈值） */
export function looksLikeNovel(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 2000) return false
  if (CHAPTER_PATTERNS.some((re) => re.test(trimmed))) return true
  return trimmed.length > 8000
}

/**
 * 剧情重组：事件总数 / 2.5 估算集数，并限制在 [min, max]。
 * 超过 batchSize（默认 5）时按批量生成，避免单次 LLM 超时。
 */
export function suggestEpisodeCount(
  eventCount: number,
  targetEpisodes: number,
  opts: { min?: number; max?: number; batchSize?: number } = {},
): { episodeCount: number; batches: number } {
  const min = opts.min ?? 1
  const max = opts.max ?? 120
  const batchSize = opts.batchSize ?? 5

  const byEvents = Math.floor(eventCount / 2.5)
  const count = Math.min(max, Math.max(min, byEvents, Math.min(targetEpisodes, max)))
  const batches = Math.max(1, Math.ceil(count / batchSize))
  return { episodeCount: count, batches }
}

/** 每章平均 5 个事件（3–7）的启发式事件数估算 */
export function estimateEventCount(chapters: NovelChapter[]): number {
  if (chapters.length === 0) return 1
  return chapters.length * 5
}

/**
 * 规则化事件抽取（无 LLM 时）：把章节按句切，取前 7 个为事件，
 * 用句内名词/动词粗估节拍强度，并截取原文片段作为 excerpt。
 */
export function extractEventsRuleBased(chapters: NovelChapter[]): NovelEvent[] {
  const events: NovelEvent[] = []
  let globalIndex = 0

  for (const chapter of chapters) {
    const sentences = chapter.text
      .split(/[。！？!?；;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6)

    sentences.slice(0, 7).forEach((sentence) => {
      globalIndex += 1
      events.push({
        index: globalIndex,
        chapterIndex: chapter.index,
        summary: sentence.slice(0, 40),
        characters: [],
        locations: [],
        // 命中冲突/反转/危机词 → 强度更高
        beat: scoreBeat(sentence),
        excerpt: sentence.slice(0, 60),
      })
    })
  }

  return events
}

function scoreBeat(sentence: string): number {
  const strong = /(杀|死|战|败|复仇|背叛|重生|反转|危机|暴露|揭穿|崩溃|绝境|逆袭)/.test(sentence)
  const mid = /(怒|恨|爱|怕|逃|追|哭|醒|惊|怒|争|斗|冲突|误会)/.test(sentence)
  if (strong) return 8
  if (mid) return 5
  return 3
}
