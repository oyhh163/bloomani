import type { NavLink } from '@bloomani/shared'

type SiteNavProps = {
  brand: string
  links: NavLink[]
  ctaLabel: string
}

export function SiteNav({ brand, links, ctaLabel }: SiteNavProps) {
  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label={`${brand} 首页`}>
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-text">{brand}</span>
      </a>
      <nav className="nav-links" aria-label="主导航">
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <a className="nav-cta" href="#start">
        {ctaLabel}
      </a>
    </header>
  )
}
