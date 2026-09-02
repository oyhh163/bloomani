import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { attachAuth, type AuthVariables } from './auth/middleware.js'
import { assertDbConfigured, env } from './config/env.js'
import { checkDbHealth, ensureLocalUser } from './db/client.js'
import { assetRoutes } from './routes/assets.js'
import { authRoutes } from './routes/auth.js'
import { contentRoutes } from './routes/content.js'
import { generateRoutes } from './routes/generate.js'
import { metaRoutes } from './routes/meta.js'
import { pipelineRoutes } from './routes/pipeline.js'
import { projectRoutes } from './routes/projects.js'
import { screenplayRoutes } from './routes/screenplays.js'
import { storyDraftRoutes } from './routes/storyDrafts.js'

const app = new Hono<{ Variables: AuthVariables }>()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
app.route('/api/pipeline', pipelineRoutes)
app.route('/api/meta', metaRoutes)
app.route('/api/generate', generateRoutes)

app.notFound((c) =>
  c.json({ ok: false, error: `路由不存在: ${c.req.method} ${c.req.path}`, code: 'NOT_FOUND' }, 404),
)

async function main() {
  assertDbConfigured()
  if (env.storageDriver === 'postgres') {
    await ensureLocalUser()
  }

  console.log(`Bloomani API listening on http://localhost:${env.port}`)
  console.log(
    `storage=${env.storageDriver} Agnes base=${env.agnesV1} image=${env.imageModel} video=${env.videoModel} configured=${Boolean(env.agnesApiKey)}`,
  )

  serve({
    fetch: app.fetch,
    port: env.port,
  })
}

main().catch((err) => {
  console.error('Failed to start API:', err)
  process.exit(1)
})
