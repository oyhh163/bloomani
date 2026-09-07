import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ThemeSwitcher } from './ThemeSwitcher'

function CaretIcon() {
  return (
    <svg
      className="account-caret"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  )
}

function initialOf(name: string): string {
  const first = name.trim().charAt(0)
  return first ? first.toUpperCase() : '?'
}

/**
 * 顶部右侧账号区：
 * - 未登录：登录按钮 + 右侧主题切换按钮
 * - 已登录：收起为用户昵称，hover 或点击展开下拉（进入个人主页 / 切换主题 / 退出登录）
 */
export function NavAccount() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)

  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)

  const open = hovered || pinned

  // 路由变化时收起下拉（在渲染期派生，避免额外的 effect）
  const [navPath, setNavPath] = useState(location.pathname)
  if (navPath !== location.pathname) {
    setNavPath(location.pathname)
    setHovered(false)
    setPinned(false)
  }

  useEffect(() => {
    if (!pinned) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setPinned(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPinned(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pinned])

  if (!user) {
    return (
      <div className="nav-actions">
        <Link className="nav-cta" to="/login">
          登录
        </Link>
        <ThemeSwitcher />
      </div>
    )
  }

  async function onLogout() {
    setBusy(true)
    try {
      await logout()
      setPinned(false)
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="nav-actions"
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="nav-cta account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">
          {initialOf(user.displayName || user.username)}
        </span>
        <span className="account-name">{user.displayName || user.username}</span>
        <CaretIcon />
      </button>

      {open ? (
        <div className="account-dropdown" role="menu" aria-label="账号菜单">
          <Link
            className="account-item"
            to="/me"
            role="menuitem"
            onClick={() => setPinned(false)}
          >
            进入个人主页
          </Link>
          <div className="account-divider" role="presentation" />
          <ThemeSwitcher variant="compact" />
          <div className="account-divider" role="presentation" />
          <button
            type="button"
            className="account-item"
            role="menuitem"
            disabled={busy}
            onClick={() => void onLogout()}
          >
            {busy ? '退出中…' : '退出登录'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
