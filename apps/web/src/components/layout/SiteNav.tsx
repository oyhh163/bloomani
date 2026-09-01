import { Link, NavLink } from 'react-router-dom'
import type { NavLink as NavLinkItem } from '@bloomani/shared'

type SiteNavProps = {
  brand: string
  links: NavLinkItem[]
  ctaLabel: string
  ctaTo?: string
}

function resolveHref(href: string): string {
  if (href.startsWith('/')) return href
  if (href.startsWith('#')) {
    const map: Record<string, string> = {
      '#character': '/character',
      '#story': '/story',
      '#generate': '/generate',
      '#start': '/character',
      '#top': '/',
    }
    return map[href] ?? '/'
  }
  return href
}

export function SiteNav({ brand, links, ctaLabel, ctaTo = '/character' }: SiteNavProps) {
  return (
    <header className="nav">
      <Link className="brand" to="/" aria-label={`${brand} 首页`}>
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-text">{brand}</span>
      </Link>
      <nav className="nav-links" aria-label="主导航">
        {links.map((link) => {
          const to = resolveHref(link.href)
          return (
            <NavLink
              key={link.href}
              to={to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          )
        })}
      </nav>
      <Link className="nav-cta" to={ctaTo}>
        {ctaLabel}
      </Link>
    </header>
  )
}
