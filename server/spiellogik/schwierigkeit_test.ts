import { assert } from '@std/assert'
import type { Schwierigkeit } from '../../shared/types.ts'
import { festerZufall } from '../testHilfen.ts'
import { labyrinthErzeugen } from './generator.ts'
import { neueKarte } from './karte.ts'
import { computerZug } from './sucher.ts'

/**
 * Simulation zu ADR-025: Der Computer-Sucher spielt viele Labyrinthe jeder Stufe bis zum Schatz.
 * Die Schwierigkeit wirkt nur über das Labyrinth (ADR-004, ADR-015). Der Sucher ist überall gleich.
 */
const LAEUFE = 300

/** Anfragen, die der Sucher in einem Labyrinth bis zum Schatz braucht */
function anfragenBisZumSchatz(schwierigkeit: Schwierigkeit, startwert: number): number {
  const zufall = festerZufall(startwert)
  const labyrinth = labyrinthErzeugen(schwierigkeit, zufall)
  let karte = neueKarte()
  let anzahl = 0
  while (true) {
    const zug = computerZug(labyrinth, karte, zufall)
    anzahl += zug.anfragen.length
    karte = zug.karte
    if (zug.anfragen.at(-1)!.ergebnis === 'schatzGefunden') return anzahl
  }
}

function mittelwert(schwierigkeit: Schwierigkeit): number {
  let summe = 0
  for (let i = 1; i <= LAEUFE; i++) summe += anfragenBisZumSchatz(schwierigkeit, i)
  return summe / LAEUFE
}

Deno.test('Simulation: schwerere Labyrinthe brauchen im Schnitt deutlich mehr Anfragen', () => {
  const einfach = mittelwert('einfach')
  const standard = mittelwert('standard')
  const schwer = mittelwert('schwer')
  const bericht = `einfach ${einfach.toFixed(1)}, standard ${standard.toFixed(1)}, schwer ${
    schwer.toFixed(1)
  }`

  // Jede Stufe mindestens ein Viertel schwerer als die vorige; gemessen etwa 11, 20 und 33
  assert(standard > einfach * 1.25, bericht)
  assert(schwer > standard * 1.25, bericht)
})
