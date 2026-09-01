import { useEffect, useState } from 'react'
import type { LandingContent } from '@bloomani/shared'
import { fetchLandingContent } from '../api/content'
import { fallbackLandingContent } from '../data/fallbackLanding'

export function useLandingContent() {
  const [content, setContent] = useState<LandingContent>(fallbackLandingContent)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')

  useEffect(() => {
    let cancelled = false

    fetchLandingContent()
      .then((data) => {
        if (cancelled) return
        setContent(data)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setContent(fallbackLandingContent)
        setStatus('fallback')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { content, status }
}
