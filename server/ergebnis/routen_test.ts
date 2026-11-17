import { assertEquals } from '@std/assert'
import type { Ergebnis, Statistik } from '../../shared/types.ts'
import { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import { Sessions } from '../auth/sessions.ts'
import { appErstellen } from '../main.ts'
import { mitTempOrdner } from '../testHilfen.ts'
import { ErgebnisSpeicher, type GespeichertesErgebnis } from './speicher.ts'

/** App mit leerem Ergebnisspeicher; der Test füllt ihn direkt, ohne echte Matches zu spielen */
async function aufbauen(pfad: string) {
  const ergebnisse = ErgebnisSpeicher.imSpeicher()
  const app = appErstellen(new Sessions(), await NutzerSpeicher.laden(pfad), { ergebnisse })

  /** Registriert einen Nutzer und liefert Session-Id und Nutzer-Id */
  async function anmelden(name: string): Promise<{ sid: string; id: string }> {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, passwort: 'geheim1234' }),
    })
    const sid = res.headers.get('Set-Cookie')?.match(/^sid=([^;]+)/)?.[1] ?? ''
    return { sid, id: (await res.json()).id }
  }

  function lesen(sid: string, pfad: string) {
    return app.request(`/api/results${pfad}`, { headers: { Cookie: `sid=${sid}` } })
  }

  return { ergebnisse, anmelden, lesen }
}

/** n Ergebnisse eines Nutzers; Spiel 0 ist das älteste, jedes zweite eine Niederlage */
function spiele(nutzerId: string, n: number): GespeichertesErgebnis[] {
  return Array.from({ length: n }, (_, i) => ({
    id: crypto.randomUUID(),
    nutzerId,
    matchId: `m${i}`,
    competitionId: null,
    runde: null,
    platzierung: null,
    modus: 'computer',
    schwierigkeit: 'standard',
    gegner: 'Computer',
    ausgang: i % 2 === 0 ? 'sieg' : 'niederlage',
    endegrund: 'schatz',
    anfragen: 10 + i,
    // Minuten als Zeitstempel: höheres i heißt später beendet
    beendetAm: new Date(Date.UTC(2026, 10, 15, 10, i)).toISOString(),
  }))
}

Deno.test('results: ohne Anmeldung 401', () =>
  mitTempOrdner(async (pfad) => {
    const { lesen } = await aufbauen(pfad)
    assertEquals((await lesen('falsch', '')).status, 401)
    assertEquals((await lesen('falsch', '/stats')).status, 401)
  }))

Deno.test('results: ohne Parameter die neuesten 10, ohne nutzerId', () =>
  mitTempOrdner(async (pfad) => {
    const { ergebnisse, anmelden, lesen } = await aufbauen(pfad)
    const anna = await anmelden('anna')
    await ergebnisse.eintragen(spiele(anna.id, 12))
    const res = await lesen(anna.sid, '')
    assertEquals(res.status, 200)
    const liste: Ergebnis[] = await res.json()
    assertEquals(liste.length, 10)
    assertEquals(liste[0].matchId, 'm11')
    assertEquals(liste[9].matchId, 'm2')
    assertEquals('nutzerId' in liste[0], false)
  }))

Deno.test('results: offset und limit blättern weiter', () =>
  mitTempOrdner(async (pfad) => {
    const { ergebnisse, anmelden, lesen } = await aufbauen(pfad)
    const anna = await anmelden('anna')
    await ergebnisse.eintragen(spiele(anna.id, 12))
    const liste: Ergebnis[] = await (await lesen(anna.sid, '?limit=5&offset=10')).json()
    // Nur noch zwei übrig: Die Seite ist kürzer als limit, das ist kein Fehler
    assertEquals(liste.map((e) => e.matchId), ['m1', 'm0'])
  }))

Deno.test('results: ungültiges limit oder offset ergibt 400', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, lesen } = await aufbauen(pfad)
    const { sid } = await anmelden('anna')
    for (const query of ['?limit=0', '?limit=101', '?limit=abc', '?limit=2.5', '?offset=-1']) {
      const res = await lesen(sid, query)
      assertEquals(res.status, 400, query)
      assertEquals((await res.json()).fehler.code, 'VALIDIERUNG')
    }
  }))

Deno.test('results: jeder sieht nur seine Ergebnisse und seine Statistik', () =>
  mitTempOrdner(async (pfad) => {
    const { ergebnisse, anmelden, lesen } = await aufbauen(pfad)
    const anna = await anmelden('anna')
    const ben = await anmelden('ben')
    await ergebnisse.eintragen(spiele(anna.id, 3))
    assertEquals(await (await lesen(ben.sid, '')).json(), [])
    const statistik: Statistik = await (await lesen(anna.sid, '/stats')).json()
    // Spiele 0 und 2 gewonnen, Spiel 1 verloren
    assertEquals(statistik, { siege: 2, niederlagen: 1, quote: 2 / 3 })
    assertEquals(await (await lesen(ben.sid, '/stats')).json(), {
      siege: 0,
      niederlagen: 0,
      quote: 0,
    })
  }))
