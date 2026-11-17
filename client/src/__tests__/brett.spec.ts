/**
 * UNIT-TESTS für brett.ts (reine Funktionen: kein Vue, kein Server, kein Mock nötig)
 * Aufbau jedes Tests nach AAA: Arrange (Daten vorbereiten), Act (Funktion aufrufen),
 * Assert (Ergebnis mit expect prüfen).
 * Testfälle je Funktion nach drei Arten:
 *   Normalfall     - der übliche Klick (Mauer setzen, Schatz legen)
 *   Grenzfall      - am Rand der Regel (30 Mauern voll, Strecke der Länge 1)
 *   falsche Eingabe - verbotene Aktion (31. Mauer, Schatz auf A1) => null
 * Start: npm run test:unit (Vitest)
 */
import type { BekannteKarte, LabyrinthEntwurf, Mauer } from '@shared/types.ts'
import { MAX_MAUERN } from '@shared/types.ts'
import { describe, expect, it } from 'vitest'
import {
  geradeZiele,
  mauerUmschalten,
  schatzSetzen,
  SPALTEN,
  spurFortschreiben,
  strecke,
  zelle,
  ZEILEN,
} from '../brett'

/** Leerer Entwurf als Ausgangspunkt für mehrere Tests */
const LEER: LabyrinthEntwurf = { schatz: null, mauern: [] }

// describe = Gruppe pro Funktion, it = ein einzelner Testfall (Satz "it ..." = "es ...")
describe('zelle', () => {
  it('baut den Namen aus Zeile und Spalte', () => {
    expect(zelle('C', 4)).toBe('C4') // toBe: exakt gleich (für einfache Werte)
  })

  it('ergibt mit ZEILEN und SPALTEN alle 36 Zellen', () => {
    const alle = ZEILEN.flatMap((z) => SPALTEN.map((s) => zelle(z, s)))
    expect(alle).toHaveLength(36)
    // Grenzfall: erste und letzte Zelle
    expect(alle[0]).toBe('A1')
    expect(alle[35]).toBe('F6')
  })
})

describe('mauerUmschalten', () => {
  // Normalfall
  it('setzt eine fehlende Mauer', () => {
    // ?. weil die Funktion auch null liefern kann
    expect(mauerUmschalten(LEER, 'A1_A2')?.mauern).toEqual(['A1_A2'])
  })

  it('entfernt eine vorhandene Mauer und lässt die anderen stehen', () => {
    const entwurf: LabyrinthEntwurf = { schatz: 'C4', mauern: ['A1_A2', 'B2_B3'] }
    // toEqual: vergleicht den Inhalt von Objekten/Listen, nicht die Identität
    expect(mauerUmschalten(entwurf, 'A1_A2')).toEqual({ schatz: 'C4', mauern: ['B2_B3'] })
  })

  // Wichtig für SpielView: Der alte Entwurf darf sich nicht ändern (Unveränderlichkeit)
  it('verändert den alten Entwurf nicht', () => {
    const entwurf: LabyrinthEntwurf = { schatz: null, mauern: ['A1_A2'] }
    mauerUmschalten(entwurf, 'B2_B3')
    mauerUmschalten(entwurf, 'A1_A2')
    expect(entwurf.mauern).toEqual(['A1_A2'])
  })

  // Grenzfall + falsche Eingabe in einem Test: genau am Limit von 30
  it('lehnt die 31. Mauer ab, erlaubt bei 30 aber das Entfernen', () => {
    // 30 Platzhalter-Mauern M0..M29; "as Mauer", weil das keine echten Mauernamen sind
    const mauern = Array.from({ length: MAX_MAUERN }, (_, i) => `M${i}` as Mauer)
    const voll: LabyrinthEntwurf = { schatz: null, mauern }
    expect(mauerUmschalten(voll, 'F5_F6')).toBeNull()
    expect(mauerUmschalten(voll, mauern[0]!)?.mauern).toHaveLength(MAX_MAUERN - 1)
  })
})

describe('schatzSetzen', () => {
  it('legt den Schatz und lässt die Mauern unverändert', () => {
    const entwurf: LabyrinthEntwurf = { schatz: null, mauern: ['A1_A2'] }
    expect(schatzSetzen(entwurf, 'C4')).toEqual({ schatz: 'C4', mauern: ['A1_A2'] })
  })

  it('verschiebt einen schon gesetzten Schatz', () => {
    expect(schatzSetzen({ schatz: 'C4', mauern: [] }, 'F6')?.schatz).toBe('F6')
  })

  // Falsche Eingabe: Spielregel verbietet den Schatz auf dem Startfeld
  it('lehnt A1 ab, denn dort startet der Gegner', () => {
    expect(schatzSetzen(LEER, 'A1')).toBeNull()
  })
})

describe('geradeZiele', () => {
  it('liefert die 10 Felder in Zeile und Spalte ohne die eigene Position', () => {
    const ziele = geradeZiele('C4')
    expect(ziele).toHaveLength(10) // 5 in der Zeile + 5 in der Spalte
    expect(ziele).toContain('C1')
    expect(ziele).toContain('F4')
    expect(ziele).not.toContain('C4') // .not dreht die Erwartung um
    expect(ziele).not.toContain('D5') // diagonal
  })
})

describe('strecke', () => {
  it('läuft in alle vier Richtungen, beide Enden eingeschlossen', () => {
    expect(strecke('A1', 'A3')).toEqual(['A1', 'A2', 'A3']) // nach rechts
    expect(strecke('C2', 'A2')).toEqual(['C2', 'B2', 'A2']) // nach oben
    expect(strecke('B5', 'B5')).toEqual(['B5']) // Grenzfall: Start = Ziel
  })
})

describe('spurFortschreiben', () => {
  const START: BekannteKarte = { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] }

  it('trägt die Strecke als besucht ein und versetzt die Figur', () => {
    // Antwort "ja": Die Figur kommt bis A4 durch
    const karte = spurFortschreiben(START, {
      ziel: 'A4',
      ergebnis: 'ja',
      position: 'A4',
      mauer: null,
    })
    expect(karte.position).toBe('A4')
    expect(karte.besuchteZellen).toEqual(['A1', 'A2', 'A3', 'A4'])
  })

  // Dieselbe Anfrage zweimal: Die Mauer darf nicht doppelt in der Liste landen
  it('merkt sich eine entdeckte Mauer genau einmal', () => {
    // as const: TypeScript nimmt 'nein' als festen Wert statt als beliebigen string
    const nein = { ziel: 'B1', ergebnis: 'nein', position: 'A1', mauer: 'A1_B1' } as const
    const karte = spurFortschreiben(spurFortschreiben(START, nein), nein)
    expect(karte.entdeckteMauern).toEqual(['A1_B1'])
    expect(karte.position).toBe('A1') // "nein": Die Figur bleibt stehen
  })
})
