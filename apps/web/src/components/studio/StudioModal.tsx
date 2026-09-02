import { useEffect, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type StudioModalProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function StudioModal({ open, title, subtitle, onClose, children }: StudioModalProps) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="studio-modal-root" role="presentation" onClick={onClose}>
      <motion.div
        className="studio-modal-backdrop"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="studio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-modal-title"
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="studio-modal-head">
          <div>
            <h2 id="studio-modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="studio-modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="studio-modal-body">{children}</div>
      </motion.div>
    </div>
  )
}
