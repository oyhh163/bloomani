import { Ambient } from '../components/layout/Ambient'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteNav } from '../components/layout/SiteNav'
import { FeatureSection } from '../components/home/FeatureSection'
import { Hero } from '../components/home/Hero'
import { useLandingContent } from '../hooks/useLandingContent'

export function HomePage() {
  const { content } = useLandingContent()

  return (
    <div className="page">
      <Ambient />
      <SiteNav brand={content.brand} links={content.navLinks} ctaLabel={content.navCta} />

      <main id="top">
        <Hero content={content.hero} />
        {content.features.map((feature, index) => (
          <FeatureSection key={feature.id} {...feature} reverse={index % 2 === 1} />
        ))}
      </main>

      <SiteFooter brand={content.brand} tagline={content.footerTagline} />
    </div>
  )
}
