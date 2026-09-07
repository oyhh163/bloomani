import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemeId = 'blossom' | 'ember'

export type ThemeOption = {
  id: ThemeId
  label: string
  hint: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'blossom', label: '樱粉青芽', hint: '淡玫红 + 淡绿' },
  { id: 'ember', label: '暗夜橙焰', hint: '黑 + 橙' },
]

const STORAGE_KEY = 'bloomani.theme'

function isThemeId(value: unknown): value is ThemeId {
  return value === 'blossom' || value === 'ember'
}

function readStoredTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isThemeId(stored)) return stored
  } catch {
    /* localStorage 不可用（隐私模式等）时回落到默认主题 */
  }
  return 'blossom'
}

function applyTheme(theme: ThemeId) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme === 'ember' ? 'dark' : 'light'
}

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  toggleTheme: () => void
  options: ThemeOption[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* 忽略写入失败 */
    }
  }, [theme])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'blossom' ? 'ember' : 'blossom'))
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, options: THEME_OPTIONS }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
