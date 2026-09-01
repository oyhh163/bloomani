import { motion, useReducedMotion } from 'framer-motion'
import type { FeatureContent } from '@bloomani/shared'
import { CharacterArt, GenerateArt, StoryArt } from '../art/FeatureArt'

type FeatureSectionProps = FeatureContent & {
  reverse: boolean
}

function FeatureVisual({ id }: { id: string }) {
  if (id === 'character') return <CharacterArt />
  if (id === 'story') return <StoryArt />
  if (id === 'generate') return <GenerateArt />
  return null
}

export function FeatureSection({
  id,
  eyebrow,
  title,
  copy,
  tone,
  reverse,
}: FeatureSectionProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section id={id} className={`feature feature-${tone} ${reverse ? 'is-reverse' : ''}`}>
      <motion.div
        className="feature-copy"
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="feature-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="feature-lead">{copy}</p>
      </motion.div>
      <motion.div
        className="feature-visual"
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <FeatureVisual id={id} />
      </motion.div>
    </section>
  )
}
