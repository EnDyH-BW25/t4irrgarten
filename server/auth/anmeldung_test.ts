import { assertEquals } from '@std/assert'
import { Hono } from '@hono/hono'
import { fehlerBehandeln } from '../fehler.ts'
import { mitTempOrdner } from '../testHilfen.ts'
import { anmeldungPruefen, type AuthUmgebung } from './anmeldung.ts'
import { NutzerSpeicher } from './nutzerSpeicher.ts'
import { Sessions } from './sessions.ts'

/** Kleine Test-App mit einer geschützten Route und einem angelegten Nutzer */
async function aufbauen(pfad: string) {
  const sessions = new Sessions()
  const speicher = await NutzerSpeicher.laden(pfad)
  const nudl = (await speicher.anlegen('nudl', 'hash'))!

  const app = new Hono<AuthUmgebung>()
  app.onError(fehlerBehandeln)
  app.get('/geheim', anmeldungPruefen(sessions, speicher), (c) => c.json(c.get('nutzer')))

  const abrufen = (sid?: string) =>
    app.request('/geheim', { headers: sid ? { Cookie: `sid=${sid}` } : {} })
  return { sessions, nudl, abrufen }
}

Deno.test('anmeldungPruefen: gültige Session gibt den Nutzer ohne Hash weiter', () =>
  mitTempOrdner(async (pfad) => {
    const { sessions, nudl, abrufen } = await aufbauen(pfad)
    const res = await abrufen(sessions.starten(nudl.id))
    assertEquals(res.status, 200)
    assertEquals(await res.json(), { id: nudl.id, name: 'nudl' })
  }))

Deno.test('anmeldungPruefen: ohne Cookie 401 NICHT_ANGEMELDET', () =>
  mitTempOrdner(async (pfad) => {
    const { abrufen } = await aufbauen(pfad)
    const res = await abrufen()
    assertEquals(res.status, 401)
    assertEquals((await res.json()).fehler.code, 'NICHT_ANGEMELDET')
  }))

Deno.test('anmeldungPruefen: ausgedachte Session 401', () =>
  mitTempOrdner(async (pfad) => {
    const { abrufen } = await aufbauen(pfad)
    assertEquals((await abrufen('ausgedacht')).status, 401)
  }))

Deno.test('anmeldungPruefen: beendete Session 401', () =>
  mitTempOrdner(async (pfad) => {
    const { sessions, nudl, abrufen } = await aufbauen(pfad)
    const sid = sessions.starten(nudl.id)
    sessions.beenden(sid)
    assertEquals((await abrufen(sid)).status, 401)
  }))

Deno.test('anmeldungPruefen: Session eines unbekannten Nutzers 401', () =>
  mitTempOrdner(async (pfad) => {
    const { sessions, abrufen } = await aufbauen(pfad)
    const res = await abrufen(sessions.starten('geloeschter-nutzer'))
    assertEquals(res.status, 401)
  }))
