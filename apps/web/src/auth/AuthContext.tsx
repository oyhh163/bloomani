import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser, LoginInput, RegisterInput } from '@bloomani/shared'
import {
  fetchMe,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../api/auth'
import { getAuthToken, setAuthToken } from '../api/client'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  requireUser: () => AuthUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setLoading(false)
      return
    }
    void fetchMe()
      .then(setUser)
      .catch(() => {
        setAuthToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginAccount(input)
    setUser(session.user)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const session = await registerAccount(input)
    setUser(session.user)
  }, [])

  const logout = useCallback(async () => {
    await logoutAccount()
    setUser(null)
  }, [])

  const requireUser = useCallback(() => user, [user])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, requireUser }),
    [user, loading, login, register, logout, requireUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
