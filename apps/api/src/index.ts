import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { assetRoutes } from './routes/assets.js'
import { contentRoutes } from './routes/content.js'
import { metaRoutes } from './routes/meta.js'
import { pipelineRoutes } from './routes/pipeline.js'
import { projectRoutes } from './routes/projects.js'
import { screenplayRoutes } from './routes/screenplays.js'

const app = new Hono()
const port = Number(process.env.PORT ?? 3001)

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
)

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'bloomani-api',
    layers: [
      'interaction',
      'agent_orchestration',
      'model_router',
      'asset_memory',
      'foundation',
    ],
  }),
)

app.route('/api/content', contentRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/assets', assetRoutes)
app.route('/api/screenplays', screenplayRoutes)
app.route('/api/pipeline', pipelineRoutes)
app.route('/api/meta', metaRoutes)

console.log(`Bloomani API listening on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
