/** Feature tone used by landing sections */
export type FeatureTone = 'rose' | 'mint' | 'blend'

export interface FeatureContent {
  id: string
  eyebrow: string
  title: string
  copy: string
  tone: FeatureTone
}

export interface HeroContent {
  brand: string
  headline: string
  lead: string
  primaryCta: string
  secondaryCta: string
}

export interface NavLink {
  href: string
  label: string
}

export interface LandingContent {
  brand: string
  navLinks: NavLink[]
  navCta: string
  hero: HeroContent
  features: FeatureContent[]
  footerTagline: string
}

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiFailure {
  ok: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export * from './anime/agents.js'
export * from './anime/assets.js'
export * from './anime/models.js'
export * from './anime/project.js'
export * from './anime/screenplay.js'
export * from './anime/pipeline.js'
export * from './anime/generation.js'
export * from './anime/storyDraft.js'
export * from './anime/auth.js'
