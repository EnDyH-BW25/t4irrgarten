import { assert, assertEquals } from '@std/assert'
import type { AnfrageAntwort, Labyrinth, Match } from '../../shared/types.ts'
import { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import { Sessions } from '../auth/sessions.ts'
import { appErstellen } from '../main.ts'
import { mitTempOrdner } from '../testHilfen.ts'
import { MatchSpeicher } from './speicher.ts'

const JETZT = new Date('2026-11-15T10:00:00Z')
// Zufall 0: Der Mensch gewinnt die Auslosung, der Computer fragt zuerst nach rechts
const ZUERST = () => 0
// Bekanntes Labyrinth des Computers: Schatz auf A3, A1 nach unten zu
const GEHEIM: Labyrinth = { schatz: 'A3', mauern: ['A1_B1'] }
const COMPUTER_MATCH = { modus: 'computer', schwierigkeit: 'standard' }

/**
 * App mit festem Zufall, verstellbarer Uhr und einem Match-Speicher, in den der Test hineinsehen
 * kann. Die Uhr steht auf JETZT, bis der Test sie mit vorspulen weiterdreht.
 */
async function aufbauen(pfad: string) {
  const matches = new MatchSpeicher()
  let zeit = JETZT
  const app = appErstellen(new Sessions(), await NutzerSpeicher.laden(pfad), {
    matches,
    uhr: () => zeit,
    zufall: ZUERST,
  })

  /** Dreht die Uhr um ms Millisekunden weiter */
  function vorspulen(ms: number) {
    zeit = new Date(zeit.getTime() + ms)
  }

  /** Registriert einen Nutzer und liefert seine Session-Id */
  async function anmelden(name: string): Promise<string> {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, passwort: 'geheim1234' }),
    })
    return res.headers.get('Set-Cookie')?.match(/^sid=([^;]+)/)?.[1] ?? ''
  }

  /** Anfrage an /api/matches...; ein Text als Body geht unverändert raus (für kaputtes JSON) */
  function senden(sid: string, methode: string, pfad: string, body?: unknown) {
    return app.request(`/api/matches${pfad}`, {
      method: methode,
      headers: { 'Content-Type': 'application/json', Cookie: `sid=${sid}` },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
  }

  /** Legt ein Match an und ersetzt das zufällige Labyrinth des Computers durch GEHEIM */
  async function neuesMatch(sid: string): Promise<string> {
    const { id } = await (await senden(sid, 'POST', '', COMPUTER_MATCH)).json()
    matches.holen(id)!.spieler[1].entwurf = structuredClone(GEHEIM)
    return id
  }

  /** Bringt ein Match bis zum Spielstart; der Mensch ist am Zug */
  async function laufendesMatch(sid: string): Promise<string> {
    const id = await neuesMatch(sid)
    await senden(sid, 'PUT', `/${id}/labyrinth`, { schatz: 'F6', mauern: ['A1_A2'] })
    await senden(sid, 'POST', `/${id}/labyrinth/place`)
    await senden(sid, 'POST', `/${id}/ready`)
    return id
  }

  /** Liest den angemeldeten Nutzer über /auth/me */
  async function ich(sid: string) {
    return await (await app.request('/api/auth/me', { headers: { Cookie: `sid=${sid}` } })).json()
  }

  return { matches, anmelden, senden, ich, neuesMatch, laufendesMatch, vorspulen }
}

/** Prüft Status und Fehlercode einer Fehlerantwort */
async function fehler(res: Response, status: number, code: string) {
  assertEquals(res.status, status)
  assertEquals((await res.json()).fehler.code, code)
}

// ---------- Anmeldung ----------

Deno.test('matches: ohne Anmeldung 401', () =>
  mitTempOrdner(async (pfad) => {
    const { senden } = await aufbauen(pfad)
    await fehler(await senden('ausgedacht', 'POST', '', COMPUTER_MATCH), 401, 'NICHT_ANGEMELDET')
  }))

// ---------- POST /matches ----------

Deno.test('POST /matches: legt ein Match im Aufbau an', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden } = await aufbauen(pfad)
    const res = await senden(await anmelden('nudl'), 'POST', '', COMPUTER_MATCH)
    assertEquals(res.status, 201)

    const match: Match = await res.json()
    assertEquals(match.status, 'aufbau')
    assertEquals(match.schwierigkeit, 'standard')
    assertEquals(match.serverZeit, JETZT.toISOString())
    assertEquals(match.gegnerLabyrinth, null)
    assertEquals(match.spieler.map((s) => s.name), ['nudl', 'Computer'])
  }))

Deno.test('POST /matches: falsche Eingaben ergeben 400', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const falsch = [
      { modus: 'duell' }, // folgt erst in Phase 4
      { modus: 'computer' }, // Schwierigkeit fehlt
      { modus: 'computer', schwierigkeit: 'extrem' },
      { modus: 'solo', schwierigkeit: 'einfach' },
      '{kaputt', // kein JSON
    ]
    for (const body of falsch) await fehler(await senden(sid, 'POST', '', body), 400, 'VALIDIERUNG')
  }))

Deno.test('POST /matches: zweites offenes Match ergibt 409', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    await senden(sid, 'POST', '', COMPUTER_MATCH)
    await fehler(await senden(sid, 'POST', '', COMPUTER_MATCH), 409, 'KONFLIKT')
  }))

Deno.test('POST /matches: merkt sich die Schwierigkeit im Account', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, ich } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    assertEquals((await ich(sid)).schwierigkeit, 'standard')
    await senden(sid, 'POST', '', { modus: 'computer', schwierigkeit: 'schwer' })
    assertEquals((await ich(sid)).schwierigkeit, 'schwer')
  }))

Deno.test('POST /matches: abgelehntes Match ändert die Schwierigkeit nicht', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, ich } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    await senden(sid, 'POST', '', { modus: 'computer', schwierigkeit: 'einfach' })
    // 409: Es gibt schon ein offenes Match. Die Wahl zählt nicht als gespielt.
    await senden(sid, 'POST', '', { modus: 'computer', schwierigkeit: 'schwer' })
    assertEquals((await ich(sid)).schwierigkeit, 'einfach')
  }))

// ---------- GET /matches/current ----------

Deno.test('GET /current: liefert das offene Match, danach 404', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    await fehler(await senden(sid, 'GET', '/current'), 404, 'NICHT_GEFUNDEN')

    const id = await neuesMatch(sid)
    const res = await senden(sid, 'GET', '/current')
    assertEquals(res.status, 200)
    assertEquals((await res.json()).id, id)

    await senden(sid, 'POST', `/${id}/resign`)
    await fehler(await senden(sid, 'GET', '/current'), 404, 'NICHT_GEFUNDEN')
  }))

Deno.test('GET /current: zeigt nie das Match eines anderen', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    await neuesMatch(await anmelden('nudl'))
    await fehler(await senden(await anmelden('knoedel'), 'GET', '/current'), 404, 'NICHT_GEFUNDEN')
  }))

// ---------- GET /matches/:id ----------

Deno.test('GET: liefert die Ansicht, 404 bei unbekannter Id, 403 für Fremde', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const nudl = await anmelden('nudl')
    const id = await neuesMatch(nudl)

    const res = await senden(nudl, 'GET', `/${id}`)
    assertEquals(res.status, 200)
    assertEquals((await res.json()).id, id)
    await fehler(await senden(nudl, 'GET', '/ausgedacht'), 404, 'NICHT_GEFUNDEN')
    await fehler(await senden(await anmelden('knoedel'), 'GET', `/${id}`), 403, 'VERBOTEN')
  }))

Deno.test('GET mit since: 304 bei gleicher Version, sonst 200', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await neuesMatch(sid)
    const { version } = await (await senden(sid, 'GET', `/${id}`)).json()

    const gleich = await senden(sid, 'GET', `/${id}?since=${version}`)
    assertEquals(gleich.status, 304)
    assertEquals(await gleich.text(), '')

    await senden(sid, 'PUT', `/${id}/labyrinth`, { schatz: 'F6', mauern: [] })
    const neu = await senden(sid, 'GET', `/${id}?since=${version}`)
    assertEquals(neu.status, 200)
    assertEquals((await neu.json()).version, version + 1)
  }))

Deno.test('GET mit since: Fremde bekommen 403 statt 304, ungültiges since 400', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const nudl = await anmelden('nudl')
    const id = await neuesMatch(nudl)
    const knoedel = await anmelden('knoedel')
    await fehler(await senden(knoedel, 'GET', `/${id}?since=1`), 403, 'VERBOTEN')
    for (const since of ['abc', '-1', '1.5', '']) {
      await fehler(await senden(nudl, 'GET', `/${id}?since=${since}`), 400, 'VALIDIERUNG')
    }
  }))

// ---------- Aufbau ----------

Deno.test('PUT labyrinth: speichert den Entwurf und liefert die Prüfung', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await neuesMatch(sid)

    // Unlösbar: A1 ist rundum zu. Der Entwurf bleibt trotzdem gespeichert.
    const res = await senden(sid, 'PUT', `/${id}/labyrinth`, {
      schatz: 'F6',
      mauern: ['A1_A2', 'A1_B1'],
    })
    assertEquals(res.status, 200)
    const match: Match = await res.json()
    assertEquals(match.meinLabyrinth?.mauern, ['A1_A2', 'A1_B1'])
    assertEquals(match.pruefung?.loesbar, false)

    await fehler(
      await senden(sid, 'PUT', `/${id}/labyrinth`, { mauern: 'A1_A2' }),
      400,
      'VALIDIERUNG',
    )
  }))

Deno.test('place: unlösbar ergibt 422 mit den Mauern im Body', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await neuesMatch(sid)
    await fehler(await senden(sid, 'POST', `/${id}/labyrinth/place`), 422, 'SCHATZ_FEHLT')

    await senden(sid, 'PUT', `/${id}/labyrinth`, { schatz: 'F6', mauern: ['A1_A2', 'A1_B1'] })
    const res = await senden(sid, 'POST', `/${id}/labyrinth/place`)
    assertEquals(res.status, 422)
    const { fehler: body } = await res.json()
    assertEquals(body.code, 'LABYRINTH_UNLOESBAR')
    assert(body.problematischeMauern.length > 0)
  }))

Deno.test('place und ready: erst startbereit, nach der Bestätigung läuft das Spiel', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await neuesMatch(sid)
    await senden(sid, 'PUT', `/${id}/labyrinth`, { schatz: 'F6', mauern: ['A1_A2'] })

    const gesetzt: Match = await (await senden(sid, 'POST', `/${id}/labyrinth/place`)).json()
    assertEquals(gesetzt.status, 'startbereit')
    assertEquals(gesetzt.startFristEndeAm, '2026-11-15T10:00:30.000Z')
    assertEquals(gesetzt.gegner?.startBestaetigt, true)
    await fehler(await senden(sid, 'POST', `/${id}/labyrinth/place`), 409, 'AUFBAU_BEENDET')

    const bereit: Match = await (await senden(sid, 'POST', `/${id}/ready`)).json()
    assertEquals(bereit.status, 'laeuft')
    assertEquals(bereit.amZug, bereit.spieler[0].id)
    assertEquals(bereit.zugEndeAm, '2026-11-15T10:01:00.000Z')
    await fehler(await senden(sid, 'POST', `/${id}/ready`), 409, 'KONFLIKT')
  }))

// ---------- Anfragen ----------

Deno.test('queries: nein liefert Ergebnis, Zug des Computers und neue Ansicht', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)

    const res = await senden(sid, 'POST', `/${id}/queries`, { anfrageNr: 1, ziel: 'F1' })
    assertEquals(res.status, 200)
    const antwort: AnfrageAntwort = await res.json()
    assertEquals([antwort.ergebnis, antwort.position, antwort.mauer], ['nein', 'A1', 'A1_B1'])
    assertEquals(antwort.computerAnfragen, [
      { ziel: 'A6', ergebnis: 'nein', position: 'A1', mauer: 'A1_A2' },
    ])
    assertEquals(antwort.match.anfrageNr, 3)
    assertEquals(antwort.match.amZug, antwort.match.spieler[0].id)
    assertEquals(antwort.match.gegnerLabyrinth, null)
  }))

Deno.test('queries: Schatz gefunden beendet das Spiel und zeigt das Labyrinth', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)

    const antwort: AnfrageAntwort = await (
      await senden(sid, 'POST', `/${id}/queries`, { anfrageNr: 1, ziel: 'A4' })
    ).json()
    assertEquals(antwort.ergebnis, 'schatzGefunden')
    assertEquals(antwort.match.status, 'beendet')
    assertEquals(antwort.match.endegrund, 'schatz')
    assertEquals(antwort.match.gegnerLabyrinth, GEHEIM)
    // Ein neues Match ist jetzt wieder möglich
    assertEquals((await senden(sid, 'POST', '', COMPUTER_MATCH)).status, 201)
  }))

Deno.test('queries: Fehler aus der Match-Schicht kommen als Fehlerformat an', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)
    const anfrage = (body: unknown) => senden(sid, 'POST', `/${id}/queries`, body)

    await fehler(await anfrage({ anfrageNr: 1, ziel: 'B2' }), 400, 'ZIEL_NICHT_GERADE')
    await fehler(await anfrage({ anfrageNr: 7, ziel: 'A2' }), 409, 'KONFLIKT')
    await fehler(await anfrage({ anfrageNr: 1 }), 400, 'VALIDIERUNG')
    await fehler(await anfrage('{kaputt'), 400, 'VALIDIERUNG')
  }))

// ---------- Aufgeben ----------

Deno.test('resign: Computer gewinnt, ein neues Match ist möglich', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)

    const res = await senden(sid, 'POST', `/${id}/resign`)
    assertEquals(res.status, 200)
    const match: Match = await res.json()
    assertEquals(match.status, 'beendet')
    assertEquals(match.siegerId, 'computer')
    assertEquals(match.endegrund, 'aufgabe')
    assertEquals(match.amZug, null)
    assertEquals(match.gegnerLabyrinth, GEHEIM)

    await fehler(await senden(sid, 'POST', `/${id}/resign`), 409, 'KONFLIKT')
    assertEquals((await senden(sid, 'POST', '', COMPUTER_MATCH)).status, 201)
  }))

Deno.test('resign: auch im Aufbau möglich', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await neuesMatch(sid)

    const match: Match = await (await senden(sid, 'POST', `/${id}/resign`)).json()
    assertEquals(match.status, 'beendet')
    assertEquals(match.aufbauEndeAm, null)
    assertEquals(match.pruefung, null)
  }))

// ---------- Fristen ----------

Deno.test('fristen: GET nach Aufbauende setzt den Entwurf, das Match wird startbereit', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, neuesMatch, vorspulen } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await neuesMatch(sid)
    await senden(sid, 'PUT', `/${id}/labyrinth`, { schatz: 'F6', mauern: ['A1_A2'] })

    vorspulen(3 * 60_000)
    const match: Match = await (await senden(sid, 'GET', `/${id}`)).json()
    assertEquals(match.status, 'startbereit')
    assertEquals(match.ich.labyrinthGesetzt, true)
    assertEquals(match.startFristEndeAm, '2026-11-15T10:03:30.000Z')
  }))

Deno.test('fristen: 15 Sekunden ohne Abruf, der Spieler verliert wegen Abwesenheit', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch, vorspulen } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)

    vorspulen(15_000)
    const match: Match = await (await senden(sid, 'GET', `/${id}`)).json()
    assertEquals(match.status, 'beendet')
    assertEquals(match.endegrund, 'abwesenheit')
    assertEquals(match.siegerId, 'computer')
  }))

Deno.test('fristen: regelmäßige Abrufe halten das Match am Leben und liefern weiter 304', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch, vorspulen } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)
    const { version } = await (await senden(sid, 'GET', `/${id}`)).json()

    for (let i = 0; i < 5; i++) {
      vorspulen(10_000)
      assertEquals((await senden(sid, 'GET', `/${id}?since=${version}`)).status, 304)
    }
    // Nach 60 Sekunden ohne Anfrage greift die Zugfrist trotz Abrufen
    vorspulen(10_000)
    const match: Match = await (await senden(sid, 'GET', `/${id}`)).json()
    assertEquals(match.endegrund, 'zugfrist')
  }))

Deno.test('fristen: verlassenes Match sperrt nicht, /current und POST tragen die Fristen nach', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch, vorspulen, matches } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const id = await laufendesMatch(sid)
    assertEquals((await senden(sid, 'GET', '/current')).status, 200)

    // Tab zu, zehn Minuten später zurück im Dashboard
    vorspulen(10 * 60_000)
    await fehler(await senden(sid, 'GET', '/current'), 404, 'NICHT_GEFUNDEN')
    assertEquals(matches.holen(id)!.endegrund, 'abwesenheit')
    assertEquals((await senden(sid, 'POST', '', COMPUTER_MATCH)).status, 201)
  }))

Deno.test('fristen: POST /matches trägt die Fristen vor der 409 nach', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch, vorspulen } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    await laufendesMatch(sid)
    await fehler(await senden(sid, 'POST', '', COMPUTER_MATCH), 409, 'KONFLIKT')

    // Ohne vorherigen Aufruf von /current: POST selbst merkt, dass das Match vorbei ist
    vorspulen(20_000)
    assertEquals((await senden(sid, 'POST', '', COMPUTER_MATCH)).status, 201)
  }))

Deno.test('fristen: ein fremder Abruf löst keine Frist aus', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, laufendesMatch, vorspulen, matches } = await aufbauen(pfad)
    const sid = await anmelden('nudl')
    const fremd = await anmelden('fremd')
    const id = await laufendesMatch(sid)

    vorspulen(20_000)
    await fehler(await senden(fremd, 'GET', `/${id}`), 403, 'VERBOTEN')
    assertEquals(matches.holen(id)!.status, 'laeuft')
  }))
