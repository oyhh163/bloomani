import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Ambient } from './Ambient'

const studioLinks = [
  { to: '/character', label: '角色设计' },
  { to: '/story', label: '剧情设计' },
  { to: '/generate', label: '内容生成' },
]

type StudioLayoutProps = {
  children: ReactNode
  eyebrow: string
  title: string
  lead?: string
  variant?: 'default' | 'portal'
}

export function StudioLayout({
  children,
  eyebrow,
  title,
  lead,
  variant = 'default',
}: StudioLayoutProps) {
  const isPortal = variant === 'portal'
  const { user } = useAuth()

  return (
    <div className={`page studio-page ${isPortal ? 'studio-page-portal' : ''}`}>
      <Ambient />
      <header className="nav">
        <Link className="brand" to="/" aria-label="Bloomani 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">Bloomani</span>
        </Link>
        <nav className="nav-links" aria-label="创作导航">
          {studioLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Link className="nav-cta" to={user ? '/me' : '/login'}>
          {user ? user.displayName : '登录'}
        </Link>
      </header>

      <main className={`studio-main ${isPortal ? 'studio-main-portal' : ''}`}>
        <header className={`studio-hero ${isPortal ? 'studio-hero-compact' : ''}`}>
          <p className="studio-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {lead && !isPortal ? <p className="studio-lead">{lead}</p> : null}
          {lead && isPortal ? <p className="studio-lead studio-lead-compact">{lead}</p> : null}
        </header>
        {children}
      </main>
    </div>
  )
}
