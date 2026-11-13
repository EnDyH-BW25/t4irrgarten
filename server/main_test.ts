import { assertEquals } from '@std/assert'
import { NutzerSpeicher } from './auth/nutzerSpeicher.ts'
import { Sessions } from './auth/sessions.ts'
import { appErstellen } from './main.ts'
import { mitTempOrdner } from './testHilfen.ts'

Deno.test('GET /api/health liefert Status ok', () =>
  mitTempOrdner(async (pfad) => {
    const app = appErstellen(new Sessions(), await NutzerSpeicher.laden(pfad))
    const res = await app.request('/api/health')
    assertEquals(res.status, 200)
    const data = await res.json()
    assertEquals(data.status, 'ok')
    assertEquals(typeof data.serverZeit, 'string')
  }))

Deno.test('unbekannte Route liefert 404', () =>
  mitTempOrdner(async (pfad) => {
    const app = appErstellen(new Sessions(), await NutzerSpeicher.laden(pfad))
    const res = await app.request('/api/gibtsnicht')
    assertEquals(res.status, 404)
    const data = await res.json()
    assertEquals(data.fehler.code, 'NICHT_GEFUNDEN')
  }))
