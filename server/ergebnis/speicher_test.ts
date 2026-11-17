import { assertEquals } from '@std/assert'
import { mitTempOrdner } from '../testHilfen.ts'
import { ErgebnisSpeicher, type GespeichertesErgebnis } from './speicher.ts'

/** Ergebnis mit Standardwerten; der Test überschreibt nur, was ihn interessiert */
function eintrag(teil: Partial<GespeichertesErgebnis>): GespeichertesErgebnis {
  return {
    id: crypto.randomUUID(),
    nutzerId: 'n1',
    matchId: 'm1',
    competitionId: null,
    runde: null,
    platzierung: null,
    modus: 'computer',
    schwierigkeit: 'standard',
    gegner: 'Computer',
    ausgang: 'sieg',
    endegrund: 'schatz',
    anfragen: 12,
    beendetAm: '2026-11-15T10:00:00.000Z',
    ...teil,
  }
}

Deno.test('ergebnisSpeicher: fehlende Datei startet leer', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await ErgebnisSpeicher.laden(pfad)
    assertEquals(speicher.vonNutzer('n1'), [])
  }))

Deno.test('ergebnisSpeicher: Einträge überleben einen Neustart', () =>
  mitTempOrdner(async (pfad) => {
    await (await ErgebnisSpeicher.laden(pfad)).eintragen([eintrag({})])
    const neu = await ErgebnisSpeicher.laden(pfad)
    assertEquals(neu.vonNutzer('n1').length, 1)
  }))

Deno.test('ergebnisSpeicher: dasselbe Match zählt pro Nutzer nur einmal', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await ErgebnisSpeicher.laden(pfad)
    await speicher.eintragen([eintrag({})])
    await speicher.eintragen([eintrag({})])
    assertEquals(speicher.vonNutzer('n1').length, 1)
  }))

Deno.test('ergebnisSpeicher: nur eigene Ergebnisse, neueste zuerst, ohne nutzerId', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await ErgebnisSpeicher.laden(pfad)
    await speicher.eintragen([
      eintrag({ matchId: 'alt', beendetAm: '2026-11-14T10:00:00.000Z' }),
      eintrag({ matchId: 'neu', beendetAm: '2026-11-15T10:00:00.000Z' }),
      eintrag({ matchId: 'fremd', nutzerId: 'n2' }),
    ])
    const liste = speicher.vonNutzer('n1')
    assertEquals(liste.map((e) => e.matchId), ['neu', 'alt'])
    assertEquals('nutzerId' in liste[0], false)
  }))

Deno.test('ergebnisSpeicher: Statistik ohne Spiele hat Quote 0', () => {
  const speicher = ErgebnisSpeicher.imSpeicher()
  assertEquals(speicher.statistik('n1'), { siege: 0, niederlagen: 0, quote: 0 })
})

Deno.test('ergebnisSpeicher: Statistik zählt nur eigene Spiele', async () => {
  const speicher = ErgebnisSpeicher.imSpeicher()
  await speicher.eintragen([
    eintrag({ matchId: 'a' }),
    eintrag({ matchId: 'b' }),
    eintrag({ matchId: 'c', ausgang: 'niederlage' }),
    eintrag({ matchId: 'd' }),
    eintrag({ matchId: 'fremd', nutzerId: 'n2', ausgang: 'niederlage' }),
  ])
  assertEquals(speicher.statistik('n1'), { siege: 3, niederlagen: 1, quote: 0.75 })
})

Deno.test('ergebnisSpeicher: Platzierung landet in allen Ergebnissen des Turniers', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await ErgebnisSpeicher.laden(pfad)
    await speicher.eintragen([
      eintrag({ matchId: 'r1', competitionId: 't1', runde: 1 }),
      eintrag({ matchId: 'r2', competitionId: 't1', runde: 2 }),
      eintrag({ matchId: 'x', competitionId: null }), // gehört zu keinem Turnier
    ])
    await speicher.platzierungEintragen('t1', [{ platz: 2, spielerId: 'n1' }])

    const neu = await ErgebnisSpeicher.laden(pfad) // auch in der Datei angekommen
    const plaetze = neu.vonNutzer('n1').map((e) => [e.matchId, e.platzierung])
    assertEquals(plaetze.sort(), [['r1', 2], ['r2', 2], ['x', null]])
  }))
