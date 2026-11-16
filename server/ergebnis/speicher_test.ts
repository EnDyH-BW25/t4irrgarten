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
