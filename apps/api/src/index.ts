import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { contentRoutes } from './routes/content.js'

const app = new Hono()
const port = Number(process.env.PORT ?? 3001)

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
)

app.get('/api/health', (c) => c.json({ ok: true, service: 'bloomani-api' }))
app.route('/api/content', contentRoutes)

console.log(`Bloomani API listening on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
