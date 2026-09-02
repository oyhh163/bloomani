import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Ambient } from '../components/layout/Ambient'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { login, register, user, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('next') || '/me'

  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true })
    }
  }, [loading, user, navigate, redirectTo])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setStatus(mode === 'login' ? '登录中…' : '注册中…')
    try {
      if (mode === 'login') {
        await login({ username, password })
      } else {
        await register({ username, password, displayName: displayName || undefined })
      }
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page auth-page">
      <Ambient />
      <header className="nav">
        <Link className="brand" to="/" aria-label="Bloomani 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">Bloomani</span>
        </Link>
        <Link className="nav-cta" to="/character">
          开始创作
        </Link>
      </header>

      <main className="auth-main">
        <section className="auth-panel">
          <p className="studio-eyebrow">账号</p>
          <h1>{mode === 'login' ? '登录' : '注册'}</h1>
          <p className="auth-lead">
            {mode === 'login'
              ? '登录后可保存项目、角色与剧情，并在个人页查看。'
              : '创建账号后，创作内容会归属到你的个人空间。'}
          </p>

          <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
            <label className="field">
              <span>用户名</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="字母数字下划线，3–32 位"
                autoComplete="username"
                required
              />
            </label>
            {mode === 'register' ? (
              <label className="field">
                <span>显示名（可选）</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：阿梨"
                  autoComplete="nickname"
                />
              </label>
            ) : null}
            <label className="field">
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </label>

            {status ? (
              <p className="status-line" role="status">
                {status}
              </p>
            ) : null}

            <div className="panel-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setStatus('')
                }}
              >
                {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
