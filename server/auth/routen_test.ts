import { assert, assertEquals, assertMatch } from '@std/assert'
import { appErstellen } from '../main.ts'
import { mitTempOrdner } from '../testHilfen.ts'
import { NutzerSpeicher } from './nutzerSpeicher.ts'
import { Sessions } from './sessions.ts'

const NUDL = { name: 'nudl', passwort: 'geheim1234' }

/** Baut eine App mit leerem Speicher und Hilfen für die Anfragen */
async function aufbauen(pfad: string) {
  const app = appErstellen(new Sessions(), await NutzerSpeicher.laden(pfad))

  const senden = (pfad: string, body: unknown, sid?: string) =>
    app.request(`/api/auth/${pfad}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(sid ? { Cookie: `sid=${sid}` } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  const ich = (sid?: string) =>
    app.request('/api/auth/me', { headers: sid ? { Cookie: `sid=${sid}` } : {} })

  return { senden, ich }
}

/** Holt die Session-Id aus dem Set-Cookie-Header der Antwort */
function sidAus(res: Response): string {
  const cookie = res.headers.get('Set-Cookie') ?? ''
  return cookie.match(/^sid=([^;]+)/)?.[1] ?? ''
}

Deno.test('register: legt Nutzer an, setzt Cookie und meldet an', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, ich } = await aufbauen(pfad)
    const res = await senden('register', NUDL)
    assertEquals(res.status, 201)
    const nutzer = await res.json()
    assertEquals(nutzer.name, 'nudl')
    assertEquals(Object.keys(nutzer).sort(), ['id', 'name'])

    const cookie = res.headers.get('Set-Cookie') ?? ''
    assertMatch(cookie, /HttpOnly/)
    assertMatch(cookie, /SameSite=Lax/)
    assertMatch(cookie, /Path=\/api/)
    assertEquals(await (await ich(sidAus(res))).json(), nutzer)
  }))

Deno.test('register: vergebener Name ergibt 409, auch mit anderer Schreibweise', () =>
  mitTempOrdner(async (pfad) => {
    const { senden } = await aufbauen(pfad)
    await senden('register', NUDL)
    const res = await senden('register', { ...NUDL, name: 'NUDL' })
    assertEquals(res.status, 409)
    assertEquals((await res.json()).fehler.code, 'KONFLIKT')
  }))

Deno.test('register: ungültige Eingabe ergibt 400 mit allen Details', () =>
  mitTempOrdner(async (pfad) => {
    const { senden } = await aufbauen(pfad)
    const res = await senden('register', { name: 'ab', passwort: 'kurz' })
    assertEquals(res.status, 400)
    const { fehler } = await res.json()
    assertEquals(fehler.code, 'VALIDIERUNG')
    assertEquals(fehler.details.map((d: { feld: string }) => d.feld), ['name', 'passwort'])
  }))

Deno.test('register: kaputtes JSON ergibt 400 statt 500', () =>
  mitTempOrdner(async (pfad) => {
    const { senden } = await aufbauen(pfad)
    const res = await senden('register', '{kaputt')
    assertEquals(res.status, 400)
  }))

Deno.test('login: richtige Daten melden an, Name ohne Rücksicht auf Schreibweise', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, ich } = await aufbauen(pfad)
    await senden('register', NUDL)
    const res = await senden('login', { ...NUDL, name: 'Nudl' })
    assertEquals(res.status, 200)
    assertEquals((await res.json()).name, 'nudl')
    assertEquals((await ich(sidAus(res))).status, 200)
  }))

Deno.test('login: falsches Passwort und unbekannter Name liefern dieselbe Antwort', () =>
  mitTempOrdner(async (pfad) => {
    const { senden } = await aufbauen(pfad)
    await senden('register', NUDL)
    const falsch = await senden('login', { ...NUDL, passwort: 'geheim9999' })
    const unbekannt = await senden('login', { ...NUDL, name: 'niemand' })
    assertEquals(falsch.status, 401)
    assertEquals(unbekannt.status, 401)
    assertEquals(await falsch.json(), await unbekannt.json())
    assertEquals(falsch.headers.get('Set-Cookie'), null)
  }))

Deno.test('login: neuer Login im selben Browser beendet die alte Session', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, ich } = await aufbauen(pfad)
    const alt = sidAus(await senden('register', NUDL))
    const neu = sidAus(await senden('login', NUDL, alt))
    assert(neu !== alt)
    assertEquals((await ich(alt)).status, 401)
    assertEquals((await ich(neu)).status, 200)
  }))

Deno.test('logout: beendet die Session und löscht das Cookie', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, ich } = await aufbauen(pfad)
    const sid = sidAus(await senden('register', NUDL))
    const res = await senden('logout', null, sid)
    assertEquals(res.status, 204)
    assertMatch(res.headers.get('Set-Cookie') ?? '', /Max-Age=0/)
    assertEquals((await ich(sid)).status, 401)
  }))

Deno.test('logout und me: ohne Session 401', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, ich } = await aufbauen(pfad)
    assertEquals((await senden('logout', null)).status, 401)
    assertEquals((await ich()).status, 401)
  }))

Deno.test('Nutzerdatei enthält kein Passwort im Klartext', () =>
  mitTempOrdner(async (pfad) => {
    const { senden } = await aufbauen(pfad)
    await senden('register', NUDL)
    const inhalt = await Deno.readTextFile(pfad)
    assert(inhalt.includes('nudl'))
    assert(!inhalt.includes(NUDL.passwort))
  }))
