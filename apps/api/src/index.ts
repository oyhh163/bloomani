import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { attachAuth, type AuthVariables } from './auth/middleware.js'
import { assertDbConfigured, env } from './config/env.js'
import { checkDbHealth, ensureLocalUser } from './db/client.js'
import { assetRoutes } from './routes/assets.js'
import { authRoutes } from './routes/auth.js'
import { characterStudioRoutes } from './routes/characterStudio.js'
import { contentRoutes } from './routes/content.js'
import { episodeRoutes } from './routes/episodes.js'
import { generateRoutes } from './routes/generate.js'
import { metaRoutes } from './routes/meta.js'
import { pipelineRoutes } from './routes/pipeline.js'
import { productionRoutes } from './routes/production.js'
import { projectRoutes } from './routes/projects.js'
import { screenplayRoutes } from './routes/screenplays.js'
import { storyDraftRoutes } from './routes/storyDrafts.js'

const app = new Hono<{ Variables: AuthVariables }>()

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'internal error'
  const stack = err instanceof Error ? err.stack : undefined
  console.error('[api] unhandled error:', err)
  const debug = process.env.NODE_ENV !== 'production'
  return c.json(
    { ok: false, error: message, code: 'INTERNAL', ...(debug ? { stack } : {}) },
    500,
  )
})

app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ],
  }),
)

app.use('/api/*', attachAuth)

app.get('/api/health', async (c) => {
  const db = env.storageDriver === 'postgres' ? await checkDbHealth() : 'skipped'
  return c.json({
    ok: true,
    service: 'bloomani-api',
    storageDriver: env.storageDriver,
    db,
    authenticated: Boolean(c.get('user')),
    agnesConfigured: Boolean(env.agnesApiKey),
    agnesBaseUrl: env.agnesV1,
    imageModel: env.imageModel,
    videoModel: env.videoModel,
    layers: [
      'interaction',
      'agent_orchestration',
      'model_router',
      'asset_memory',
      'foundation',
      'agnes_render',
    ],
  })
})

app.route('/api/auth', authRoutes)
app.route('/api/content', contentRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/assets', assetRoutes)
app.route('/api/screenplays', screenplayRoutes)
app.route('/api/story-drafts', storyDraftRoutes)
app.route('/api/episodes', episodeRoutes)
app.route('/api/production', productionRoutes)
app.route('/api/pipeline', pipelineRoutes)
app.route('/api/meta', metaRoutes)
app.route('/api/generate', generateRoutes)
app.route('/api/character-studio', characterStudioRoutes)

app.notFound((c) =>
  c.json({ ok: false, error: `路由不存在: ${c.req.method} ${c.req.path}`, code: 'NOT_FOUND' }, 404),
)

async function main() {
  assertDbConfigured()
  if (env.storageDriver === 'postgres') {
    await ensureLocalUser()
  }

  serve({
    fetch: app.fetch,
    port: env.port,
  })
}

main().catch((err) => {
  console.error('Failed to start API:', err)
  process.exit(1)
})
