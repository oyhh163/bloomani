import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeContext'

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="9.5" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="15" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14.5" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  )
}

type ThemeSwitcherProps = {
  /** inline：未登录时展示在登录按钮右侧的独立按钮；compact：账号下拉里的紧凑选择行 */
  variant?: 'inline' | 'compact'
}

export function ThemeSwitcher({ variant = 'inline' }: ThemeSwitcherProps) {
  const { theme, setTheme, options } = useTheme()
  const location = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // 路由变化时收起菜单（在渲染期派生，避免额外的 effect）
  const [navPath, setNavPath] = useState(location.pathname)
  if (navPath !== location.pathname) {
    setNavPath(location.pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (variant === 'compact') {
    return (
      <div className="account-section">
        <p className="account-menu-label">切换主题</p>
        <div className="account-theme-row">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`account-theme-btn ${theme === option.id ? 'is-active' : ''}`}
              aria-pressed={theme === option.id}
              title={option.hint}
              onClick={() => setTheme(option.id)}
            >
              <span className="theme-swatch" data-preview={option.id} aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="theme-switch" ref={rootRef}>
      <button
        type="button"
        className={`theme-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="切换主题"
        title="切换主题"
        onClick={() => setOpen((value) => !value)}
      >
        <PaletteIcon />
      </button>
      {open ? (
        <div className="theme-menu" role="menu" aria-label="主题配色">
          <p className="theme-menu-label">主题配色</p>
          {options.map((option) => {
            const active = theme === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`theme-option ${active ? 'is-active' : ''}`}
                onClick={() => {
                  setTheme(option.id)
                  setOpen(false)
                }}
              >
                <span className="theme-swatch" data-preview={option.id} aria-hidden="true" />
                <span className="theme-option-copy">
                  <span>{option.label}</span>
                  <span className="theme-option-hint">{option.hint}</span>
                </span>
                {active ? (
                  <span className="theme-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
