import { motion, useReducedMotion } from 'framer-motion'
import type { HeroContent } from '@bloomani/shared'
import { HeroArt } from '../art/FeatureArt'

type HeroProps = {
  content: HeroContent
}

export function Hero({ content }: HeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="hero">
      <div className="hero-stage" aria-hidden="true">
        <HeroArt />
      </div>

      <div className="hero-copy">
        <motion.p
          className="brand-hero"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {content.brand}
        </motion.p>
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {content.headline}
        </motion.h1>
        <motion.p
          className="hero-lead"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {content.lead}
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <a className="btn btn-primary" href="#start" id="start">
            {content.primaryCta}
          </a>
          <a className="btn btn-ghost" href="#character">
            {content.secondaryCta}
          </a>
        </motion.div>
      </div>
    </section>
  )
}
