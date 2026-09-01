import { Hono } from 'hono'
import type { ApiResponse, LandingContent } from '@bloomani/shared'
import { landingContent } from '../data/landing.js'

export const contentRoutes = new Hono()

contentRoutes.get('/landing', (c) => {
  const body: ApiResponse<LandingContent> = {
    ok: true,
    data: landingContent,
  }
  return c.json(body)
})
