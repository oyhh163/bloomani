import type {
  ApiResponse,
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  WorkspaceSnapshot,
} from '@bloomani/shared'
import { apiGet, apiPost, setAuthToken } from './client'

export async function registerAccount(input: RegisterInput): Promise<AuthSession> {
  const result = await apiPost<ApiResponse<AuthSession>>('/api/auth/register', input)
  if (!result.ok) throw new Error(result.error)
  setAuthToken(result.data.token)
  return result.data
}

export async function loginAccount(input: LoginInput): Promise<AuthSession> {
  const result = await apiPost<ApiResponse<AuthSession>>('/api/auth/login', input)
  if (!result.ok) throw new Error(result.error)
  setAuthToken(result.data.token)
  return result.data
}

export async function logoutAccount(): Promise<void> {
  try {
    await apiPost<ApiResponse<{ loggedOut: boolean }>>('/api/auth/logout', {})
  } finally {
    setAuthToken(null)
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const result = await apiGet<ApiResponse<AuthUser>>('/api/auth/me')
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export async function fetchWorkspace(): Promise<WorkspaceSnapshot> {
  const result = await apiGet<ApiResponse<WorkspaceSnapshot>>('/api/auth/workspace')
  if (!result.ok) throw new Error(result.error)
  return result.data
}
