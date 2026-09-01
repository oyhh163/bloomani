import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Ambient } from './Ambient'
import { SiteFooter } from './SiteFooter'

const studioLinks = [
  { to: '/character', label: '角色设计' },
  { to: '/story', label: '剧情设计' },
  { to: '/generate', label: '内容生成' },
]

type StudioLayoutProps = {
  children: ReactNode
  eyebrow: string
  title: string
  lead: string
}

export function StudioLayout({ children, eyebrow, title, lead }: StudioLayoutProps) {
  return (
    <div className="page studio-page">
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
        <Link className="nav-cta" to="/character">
          开始创作
        </Link>
      </header>

      <main className="studio-main">
        <header className="studio-hero">
          <p className="studio-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="studio-lead">{lead}</p>
        </header>
        {children}
      </main>

      <SiteFooter brand="Bloomani" tagline="AI 动画创作工具 · 让故事轻轻开拍" />
    </div>
  )
}
