import { assertEquals } from '@std/assert'
import { app } from './main.ts'

Deno.test('GET /api/health liefert Status ok', async () => {
  const res = await app.request('/api/health')
  assertEquals(res.status, 200)
  const data = await res.json()
  assertEquals(data.status, 'ok')
  assertEquals(typeof data.serverZeit, 'string')
})

Deno.test('unbekannte Route liefert 404', async () => {
  const res = await app.request('/api/gibtsnicht')
  assertEquals(res.status, 404)
  const data = await res.json()
  assertEquals(data.fehler.code, 'NICHT_GEFUNDEN')
})
