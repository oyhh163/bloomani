const TOKEN_KEY = 'bloomani.auth.token'

let authToken: string | null = readStoredToken()

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  return authToken
}

export function setAuthToken(token: string | null): void {
  authToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    throw new ApiError(`空响应: ${response.url}`, response.status)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    const preview = text.slice(0, 80).replace(/\s+/g, ' ')
    throw new ApiError(
      `接口返回了非 JSON 内容（HTTP ${response.status}）：${preview}`,
      response.status,
    )
  }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined),
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  return headers
}

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  const body = await parseJson<T & { ok?: boolean; error?: string; code?: string }>(response)

  if (!response.ok || (body && typeof body === 'object' && 'ok' in body && body.ok === false)) {
    const errBody = body as { error?: string; code?: string }
    throw new ApiError(errBody.error ?? `Request failed: ${path}`, response.status, errBody.code)
  }

  return body as T
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  })
  return parseResponse<T>(response, path)
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return parseResponse<T>(response, path)
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return parseResponse<T>(response, path)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseResponse<T>(response, path)
}
