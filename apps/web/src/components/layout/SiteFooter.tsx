type SiteFooterProps = {
  brand: string
  tagline: string
}

export function SiteFooter({ brand, tagline }: SiteFooterProps) {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="brand-mark" aria-hidden="true" />
        <span>{brand}</span>
      </div>
      <p>{tagline}</p>
    </footer>
  )
}
