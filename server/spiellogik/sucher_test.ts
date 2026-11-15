import { assert, assertEquals, assertThrows } from '@std/assert'
import type { BekannteKarte, Mauer, Schwierigkeit, Zelle } from '../../shared/types.ts'
import { festerZufall } from '../testHilfen.ts'
import { labyrinthErzeugen } from './generator.ts'
import { neueKarte } from './karte.ts'
import { computerZug, MAX_ANFRAGEN_PRO_ZUG, zielWaehlen } from './sucher.ts'

function karte(position: Zelle, besuchteZellen: Zelle[], entdeckteMauern: Mauer[]): BekannteKarte {
  return { position, besuchteZellen, entdeckteMauern }
}

Deno.test('zielWaehlen: ohne Wissen fragt der Sucher bis an den Rand', () => {
  for (let i = 0; i < 50; i++) {
    const ziel = zielWaehlen(neueKarte(), festerZufall(i))
    assert(ziel === 'A6' || ziel === 'F1', ziel)
  }
})

Deno.test('zielWaehlen: stoppt vor einer bekannten Mauer', () => {
  // Nach unten ist A1 zu, nach rechts geht es nur bis A3
  const k = karte('A1', ['A1'], ['A1_B1', 'A3_A4'])
  assertEquals(zielWaehlen(k, festerZufall(1)), 'A3')
})

Deno.test('zielWaehlen: bevorzugt eine Richtung mit unbesuchten Zellen', () => {
  // Zeile A ist schon bekannt, Spalte 1 noch nicht
  const k = karte('A1', ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], [])
  for (let i = 0; i < 50; i++) assertEquals(zielWaehlen(k, festerZufall(i)), 'F1')
})

Deno.test('zielWaehlen: ohne Neuland in Sicht läuft er zur nächsten Stelle mit Neuland', () => {
  // A1 bis A3 sind bekannt, A1 ist nach unten zu, hinter A3 steht eine Mauer.
  // Von A1 aus gibt es kein Neuland. Erst von A2 und A3 aus sieht man nach unten.
  const k = karte('A1', ['A1', 'A2', 'A3'], ['A1_B1', 'A3_A4'])
  assertEquals(zielWaehlen(k, festerZufall(3)), 'A2')
})

Deno.test('zielWaehlen: der Weg zum Neuland nutzt eine ganze Gerade', () => {
  // Spalte 1 bis E1 bekannt, E1 nach rechts und unten zu, B1 bis D1 nach rechts zu.
  // Nur A1 sieht nach rechts Neuland, also geht es von E1 in einer Anfrage nach A1.
  const k = karte(
    'E1',
    ['A1', 'B1', 'C1', 'D1', 'E1'],
    ['B1_B2', 'C1_C2', 'D1_D2', 'E1_E2', 'E1_F1'],
  )
  assertEquals(zielWaehlen(k, festerZufall(3)), 'A1')
})

Deno.test('zielWaehlen: eine eingemauerte Figur ist ein Programmfehler', () => {
  assertThrows(() => zielWaehlen(karte('A1', ['A1'], ['A1_A2', 'A1_B1'])))
})

Deno.test('computerZug: nur die letzte Anfrage eines Zugs ist kein ja', () => {
  const labyrinth = labyrinthErzeugen('standard', festerZufall(7))
  const { anfragen } = computerZug(labyrinth, neueKarte(), festerZufall(7))
  const letzte = anfragen[anfragen.length - 1]
  assert(letzte.ergebnis !== 'ja')
  assert(anfragen.slice(0, -1).every((a) => a.ergebnis === 'ja'))
})

// Ganze Partie: Der Computer spielt Zug um Zug, bis er den Schatz findet
const SCHWIERIGKEITEN: Schwierigkeit[] = ['einfach', 'standard', 'schwer']
for (const schwierigkeit of SCHWIERIGKEITEN) {
  Deno.test(`computerZug (${schwierigkeit}): findet den Schatz in jedem Labyrinth`, () => {
    for (let i = 0; i < 100; i++) {
      const labyrinth = labyrinthErzeugen(schwierigkeit, festerZufall(i))
      const zufall = festerZufall(1000 + i)
      let k = neueKarte()
      let zuege = 0
      let gefunden = false

      while (!gefunden) {
        const zug = computerZug(labyrinth, k, zufall)
        zuege++
        assert(zug.anfragen.length < MAX_ANFRAGEN_PRO_ZUG, `Lauf ${i}: Zug ohne Ende`)
        // Jeder Zug endet an einer neuen Mauer, nie an einer bekannten
        const letzte = zug.anfragen[zug.anfragen.length - 1]
        if (letzte.mauer) assert(!k.entdeckteMauern.includes(letzte.mauer), `Lauf ${i}`)
        gefunden = letzte.ergebnis === 'schatzGefunden'
        k = zug.karte
        // Jeder Zug ohne Schatz entdeckt eine Mauer, also gibt es höchstens Mauern + 1 Züge
        assert(zuege <= labyrinth.mauern.length + 1, `Lauf ${i}: ${zuege} Züge`)
      }
    }
  })
}
