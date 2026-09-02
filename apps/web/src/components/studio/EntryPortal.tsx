import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export type PortalEntry = {
  id: string
  label: string
  hint: string
  tone: 'rose' | 'mint' | 'blend' | 'violet'
  guide: ReactNode
}

type EntryPortalProps = {
  entries: PortalEntry[]
  onSelect: (id: string) => void
}

export function EntryPortal({ entries, onSelect }: EntryPortalProps) {
  const reduceMotion = useReducedMotion()
  const count = entries.length

  return (
    <div
      className="entry-portal"
      data-count={count}
      role="list"
      aria-label="创作入口"
    >
      {entries.map((entry, index) => (
        <motion.button
          key={entry.id}
          type="button"
          role="listitem"
          className={`entry-card tone-${entry.tone}`}
          onClick={() => onSelect(entry.id)}
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.07,
            ease: [0.22, 1, 0.36, 1],
          }}
          whileHover={reduceMotion ? undefined : { y: -6, scale: 1.015 }}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        >
          <span className="entry-card-glow" aria-hidden="true" />
          <span className="entry-card-art" aria-hidden="true">
            {entry.guide}
          </span>
          <span className="entry-card-copy">
            <span className="entry-card-label">{entry.label}</span>
            <span className="entry-card-hint">{entry.hint}</span>
          </span>
          <span className="entry-card-cta" aria-hidden="true">
            进入
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 9h10M10 5l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </motion.button>
      ))}
    </div>
  )
}
