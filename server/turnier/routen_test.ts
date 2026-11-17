import { assert, assertEquals } from '@std/assert'
import type { Ergebnis, Match, Turnier } from '../../shared/types.ts'
import { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import { Sessions } from '../auth/sessions.ts'
import { ErgebnisSpeicher } from '../ergebnis/speicher.ts'
import { appErstellen } from '../main.ts'
import { beenden } from '../match/ablauf.ts'
import { MatchSpeicher } from '../match/speicher.ts'
import { festerZufall, mitTempOrdner } from '../testHilfen.ts'
import { TURNIER_CODE_DAUER_MS } from './ablauf.ts'

const JETZT = new Date('2026-11-17T10:00:00Z')
const ANLEGEN = { groesse: 4, schwierigkeit: 'schwer' }

/** App mit verstellbarer Uhr und Match-Speicher zum Hineinsehen, wie in match/routen_test.ts */
async function aufbauen(pfad: string) {
  const matches = new MatchSpeicher()
  let zeit = JETZT
  const app = appErstellen(new Sessions(), await NutzerSpeicher.laden(pfad), {
    matches,
    ergebnisse: ErgebnisSpeicher.imSpeicher(),
    uhr: () => zeit,
    // Fester Startwert statt immer 0: Sonst wäre jeder Code AAAAA, und ein zweiter Code fände nie Platz
    zufall: festerZufall(7),
  })

  async function anmelden(name: string): Promise<string> {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, passwort: 'geheim1234' }),
    })
    return res.headers.get('Set-Cookie')?.match(/^sid=([^;]+)/)?.[1] ?? ''
  }

  /** Anfrage an /api...; der Pfad beginnt mit /competitions, /matches oder /results */
  function senden(sid: string, methode: string, pfad: string, body?: unknown) {
    return app.request(`/api${pfad}`, {
      method: methode,
      headers: { 'Content-Type': 'application/json', Cookie: `sid=${sid}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  async function turnier(sid: string, id: string): Promise<Turnier> {
    return await (await senden(sid, 'GET', `/competitions/${id}`)).json()
  }

  /** Anna legt an, die weiteren treten bei. Liefert Turnier-Id und Sessions in Reihenfolge. */
  async function warteraum(...namen: string[]) {
    const sids = []
    for (const n of namen) sids.push(await anmelden(n))
    const angelegt: Turnier = await (await senden(sids[0], 'POST', '/competitions', ANLEGEN))
      .json()
    for (const sid of sids.slice(1)) {
      await senden(sid, 'POST', '/competitions/join', { code: angelegt.code })
    }
    return { id: angelegt.id, code: angelegt.code!, sids }
  }

  return {
    matches,
    anmelden,
    senden,
    turnier,
    warteraum,
    vorspulen: (ms: number) => (zeit = new Date(zeit.getTime() + ms)),
  }
}

async function fehler(res: Response, status: number, code: string) {
  assertEquals(res.status, status)
  assertEquals((await res.json()).fehler.code, code)
}

Deno.test('POST /competitions: Host sieht Code und Frist, falsche Größe 400', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden } = await aufbauen(pfad)
    const anna = await anmelden('Anna')
    await fehler(
      await senden(anna, 'POST', '/competitions', { ...ANLEGEN, groesse: 8 }),
      400,
      'VALIDIERUNG',
    )

    const res = await senden(anna, 'POST', '/competitions', ANLEGEN)
    assertEquals(res.status, 201)
    const t: Turnier = await res.json()
    assertEquals([t.status, t.teilnehmer.length, t.code?.length], ['wartet', 1, 5])
    assertEquals(new Date(t.codeEndeAm!).getTime() - JETZT.getTime(), TURNIER_CODE_DAUER_MS)
  }))

Deno.test('POST /join: Teilnehmer sehen keinen Code, Duell-Code und unbekannter Code 404', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, warteraum } = await aufbauen(pfad)
    const { code, sids } = await warteraum('Anna', 'Ben')
    const ben = await (await senden(sids[1], 'GET', '/competitions/current')).json()
    assertEquals([ben.teilnehmer.length, ben.code, ben.codeEndeAm], [2, null, null])

    const clara = await anmelden('Clara')
    const david = await anmelden('David')
    const duell: Match = await (await senden(david, 'POST', '/matches', { modus: 'duell' })).json()
    await fehler(
      await senden(clara, 'POST', '/competitions/join', { code: duell.code }),
      404,
      'CODE_UNGUELTIG',
    )
    await fehler(
      await senden(clara, 'POST', '/competitions/join', { code: 'ZZZZZ' }),
      404,
      'CODE_UNGUELTIG',
    )
    // Umgekehrt: Der Turnier-Code taugt nicht als Duell-Code
    await fehler(await senden(clara, 'POST', '/matches/join', { code }), 404, 'CODE_UNGUELTIG')
  }))

Deno.test('Sperre: im Turnier kein Match, mit offenem Match kein Turnier', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, warteraum } = await aufbauen(pfad)
    const { code, sids } = await warteraum('Anna')
    const computer = { modus: 'computer', schwierigkeit: 'standard' }
    await fehler(await senden(sids[0], 'POST', '/matches', computer), 409, 'KONFLIKT')
    await fehler(await senden(sids[0], 'POST', '/competitions', ANLEGEN), 409, 'KONFLIKT')

    const ben = await anmelden('Ben')
    await senden(ben, 'POST', '/matches', computer)
    await fehler(await senden(ben, 'POST', '/competitions/join', { code }), 409, 'KONFLIKT')
  }))

Deno.test('start: nur Host, ab drei Spielern; dann Runde 1 mit Computer', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, warteraum } = await aufbauen(pfad)
    const { id, sids } = await warteraum('Anna', 'Ben')
    await fehler(await senden(sids[1], 'POST', `/competitions/${id}/start`), 403, 'VERBOTEN')
    await fehler(
      await senden(sids[0], 'POST', `/competitions/${id}/start`),
      409,
      'ZU_WENIG_SPIELER',
    )
  }))

Deno.test('start: drei Spieler, Computer füllt auf, jeder hat sein Match', () =>
  mitTempOrdner(async (pfad) => {
    const { senden, warteraum } = await aufbauen(pfad)
    const { id, sids } = await warteraum('Anna', 'Ben', 'Clara')
    const res = await senden(sids[0], 'POST', `/competitions/${id}/start`)
    assertEquals(res.status, 200)
    const t: Turnier = await res.json()

    assertEquals([t.status, t.code, t.teilnehmer.length], ['laeuft', null, 4])
    assertEquals(t.runden[0].matches.length, 2)
    assert(t.meinNaechstesMatchId)

    // Das Match ist ein normales Match mit Turnierbezug, für jeden sein eigenes
    for (const sid of sids) {
      const meins: Turnier = await (await senden(sid, 'GET', `/competitions/${id}`)).json()
      const match: Match =
        await (await senden(sid, 'GET', `/matches/${meins.meinNaechstesMatchId}`))
          .json()
      assertEquals([match.status, match.competitionId], ['aufbau', id])
    }
  }))

Deno.test('Warteraum: Teilnehmer geht, Host geht, Code läuft ab', () =>
  mitTempOrdner(async (pfad) => {
    const { anmelden, senden, turnier, warteraum, vorspulen } = await aufbauen(pfad)
    const { id, sids } = await warteraum('Anna', 'Ben', 'Clara')

    assertEquals(
      (await senden(sids[1], 'DELETE', `/competitions/${id}/participants/me`)).status,
      204,
    )
    assertEquals((await turnier(sids[0], id)).teilnehmer.length, 2)
    assertEquals((await senden(sids[1], 'GET', '/competitions/current')).status, 404)

    await senden(sids[0], 'DELETE', `/competitions/${id}/participants/me`)
    assertEquals((await turnier(sids[2], id)).status, 'abgebrochen')
    // Clara ist wieder frei
    assertEquals((await senden(sids[2], 'GET', '/competitions/current')).status, 404)

    // Neues Turnier, Code läuft nach 30 Minuten ab
    const neu = await warteraum('Emma')
    vorspulen(TURNIER_CODE_DAUER_MS)
    const fritz = await anmelden('Fritz')
    await fehler(
      await senden(fritz, 'POST', '/competitions/join', { code: neu.code }),
      404,
      'CODE_UNGUELTIG',
    )
  }))

Deno.test('Ganzes Turnier: Runde 2 beim Abruf, Walkover, Platzierung in den Ergebnissen', () =>
  mitTempOrdner(async (pfad) => {
    const { matches, senden, turnier, warteraum } = await aufbauen(pfad)
    const { id, sids } = await warteraum('Anna', 'Ben', 'Clara', 'David')
    await senden(sids[0], 'POST', `/competitions/${id}/start`)

    // Runde 1: Im ersten Match findet spielerA den Schatz, im zweiten gibt spielerB auf
    const r1 = (await turnier(sids[0], id)).runden[0].matches
    beenden(matches.holen(r1[0].matchId)!, r1[0].spielerA.id, 'schatz', JETZT)
    const aufgeber =
      sids[['anna', 'ben', 'clara', 'david'].indexOf(r1[1].spielerB.name.toLowerCase())]
    await senden(aufgeber, 'POST', `/matches/${r1[1].matchId}/resign`)

    // Der nächste Abruf legt Runde 2 an; das Spiel um Platz 3 ist kampflos entschieden
    const t = await turnier(sids[0], id)
    assertEquals(t.runden.length, 2)
    const [finale, um3] = t.runden[1].matches
    assertEquals([finale.platzUm, finale.status], [[1, 2], 'aufbau'])
    assertEquals([um3.platzUm, um3.status, um3.siegerId], [[3, 4], 'beendet', r1[0].spielerB.id])

    // Finale: spielerB findet den Schatz
    beenden(matches.holen(finale.matchId)!, finale.spielerB.id, 'schatz', JETZT)
    const ende = await turnier(sids[0], id)
    assertEquals(ende.status, 'beendet')
    assertEquals(ende.platzierungen.map((p) => p.spieler.id), [
      finale.spielerB.id,
      finale.spielerA.id,
      r1[0].spielerB.id,
      r1[1].spielerB.id,
    ])
    assertEquals((await senden(sids[0], 'GET', '/competitions/current')).status, 404)

    // Jeder hat zwei Ergebnisse mit Turnier, Runde und Endplatz
    for (const sid of sids) {
      const liste: Ergebnis[] = await (await senden(sid, 'GET', '/results')).json()
      assertEquals(liste.length, 2)
      assert(liste.every((e) => e.competitionId === id && e.platzierung !== null))
      assertEquals(liste.map((e) => e.runde).sort(), [1, 2])
    }
  }))
