import { Hono } from '@hono/hono'
import { logger } from '@hono/hono/logger'
import { fehlerBehandeln, nichtGefunden } from './fehler.ts'

export const app = new Hono().basePath('/api')

app.use(logger())
app.onError(fehlerBehandeln)
app.notFound(nichtGefunden)

app.get('/health', (c) => c.json({ status: 'ok', serverZeit: new Date().toISOString() }))

if (import.meta.main) {
  Deno.serve({ port: 8000 }, app.fetch)
}
