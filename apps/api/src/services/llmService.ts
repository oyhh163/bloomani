import { env } from '../config/env.js'
import { createChatCompletion } from '../providers/agnes.js'

export interface CompleteTextOptions {
  system: string
  user: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface CompleteJsonResult<T> {
  data: T
  model: string
  /** false 表示走了确定性回退（未配置 Key 或调用失败） */
  usedLlm: boolean
  error?: string
}

/** 从 LLM 输出中抠出第一个 JSON 块（兼容 ```json 围栏与前后废话） */
export function extractJson(text: string): unknown | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text

  const start = candidate.search(/[[{]/)
  if (start === -1) return undefined

  const opener = candidate[start]
  const closer = opener === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === opener) depth += 1
    else if (ch === closer) {
      depth -= 1
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1)
        try {
          return JSON.parse(slice)
        } catch {
          return undefined
        }
      }
    }
  }

  return undefined
}

export async function completeText(opts: CompleteTextOptions): Promise<string> {
  if (!env.agnesApiKey) {
    throw new Error('AGNES_API_KEY is not set')
  }

  const response = await createChatCompletion({
    model: opts.model ?? env.llmModel,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4000,
  })

  const content = response.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Agnes chat completion returned empty content')
  }
  return content
}

/**
 * 结构化输出：成功解析 JSON 即用之，否则回退到规则化结果。
 * 保证流水线在 LLM 不可用时不中断。
 */
export async function completeJson<T>(
  opts: CompleteTextOptions & { fallback: () => T },
): Promise<CompleteJsonResult<T>> {
  const model = opts.model ?? env.llmModel
  if (!env.agnesApiKey) {
    return { data: opts.fallback(), model, usedLlm: false, error: 'AGNES_API_KEY is not set' }
  }

  try {
    const content = await completeText(opts)
    const parsed = extractJson(content)
    if (parsed === undefined) {
      return {
        data: opts.fallback(),
        model,
        usedLlm: false,
        error: 'LLM output is not valid JSON',
      }
    }
    return { data: parsed as T, model, usedLlm: true }
  } catch (error) {
    return {
      data: opts.fallback(),
      model,
      usedLlm: false,
      error: error instanceof Error ? error.message : 'LLM call failed',
    }
  }
}
