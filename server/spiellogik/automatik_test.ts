import { assert, assertEquals } from '@std/assert'
import type { Mauer } from '../../shared/types.ts'
import { festerZufall } from '../testHilfen.ts'
import { labyrinthVervollstaendigen, zufaelligerSchatz } from './automatik.ts'
import { erreichbareZellen } from './erreichbarkeit.ts'
import { alleMauern } from './generator.ts'
import { loesbarkeitPruefen } from './regeln.ts'

Deno.test('zufaelligerSchatz: ohne Mauern liegt der Schatz irgendwo, nie auf A1', () => {
  const zufall = festerZufall(1)
  for (let i = 0; i < 100; i++) {
    const schatz = zufaelligerSchatz([], zufall)
    assert(schatz !== null)
    assert(schatz !== 'A1', 'Schatz auf dem Start')
  }
})

Deno.test('zufaelligerSchatz: nur erreichbare Zellen kommen in Frage', () => {
  // A1 und A2 sind vom Rest getrennt: Nur A2 bleibt übrig
  const mauern: Mauer[] = ['A1_B1', 'A2_B2', 'A2_A3']
  assertEquals([...erreichbareZellen(mauern)].sort(), ['A1', 'A2'])
  assertEquals(zufaelligerSchatz(mauern, festerZufall(1)), 'A2')
})

Deno.test('zufaelligerSchatz: A1 eingemauert ergibt null', () => {
  assertEquals(zufaelligerSchatz(['A1_A2', 'A1_B1'], Math.random), null)
})

Deno.test('zufaelligerSchatz: Zufall 0 wählt den ersten, knapp 1 den letzten Kandidaten', () => {
  // Erreichbar: A1, A2, A3 (in dieser Reihenfolge der Breitensuche). Ohne A1 bleiben A2 und A3.
  const mauern: Mauer[] = ['A1_B1', 'A2_B2', 'A3_B3', 'A3_A4']
  assertEquals(zufaelligerSchatz(mauern, () => 0), 'A2')
  assertEquals(zufaelligerSchatz(mauern, () => 0.99), 'A3')
})

// ---------- labyrinthVervollstaendigen ----------

Deno.test('vervollständigen: ein lösbarer Entwurf bleibt unverändert', () => {
  const entwurf = { schatz: 'C4' as const, mauern: ['A1_A2'] as Mauer[] }
  assertEquals(labyrinthVervollstaendigen(entwurf, Math.random), entwurf)
})

Deno.test('vervollständigen: fehlender Schatz kommt auf eine erreichbare Zelle', () => {
  const mauern: Mauer[] = ['A1_A2', 'B1_B2']
  const labyrinth = labyrinthVervollstaendigen({ schatz: null, mauern }, festerZufall(3))
  assertEquals(labyrinth.mauern, mauern)
  assertEquals(loesbarkeitPruefen(labyrinth).loesbar, true)
})

Deno.test('vervollständigen: A1 eingemauert und ohne Schatz, eine Mauer geht auf', () => {
  const labyrinth = labyrinthVervollstaendigen(
    { schatz: null, mauern: ['A1_A2', 'A1_B1'] },
    festerZufall(1),
  )
  assertEquals(labyrinth.mauern.length, 1)
  assertEquals(loesbarkeitPruefen(labyrinth).loesbar, true)
})

Deno.test('vervollständigen: unerreichbarer Schatz, nur markierte Mauern gehen auf', () => {
  // F6 ist von zwei Mauern eingeschlossen; A1_A2 hat mit dem Weg nichts zu tun
  const mauern: Mauer[] = ['A1_A2', 'E6_F6', 'F5_F6']
  const labyrinth = labyrinthVervollstaendigen({ schatz: 'F6', mauern }, festerZufall(1))
  assertEquals(labyrinth.schatz, 'F6')
  assertEquals(labyrinth.mauern.length, 2)
  assert(labyrinth.mauern.includes('A1_A2'), 'eine unbeteiligte Mauer wurde geöffnet')
  assertEquals(loesbarkeitPruefen(labyrinth).loesbar, true)
})

Deno.test('vervollständigen: jeder zufällige Entwurf wird lösbar', () => {
  const zufall = festerZufall(7)
  const alle = alleMauern()
  for (let i = 0; i < 200; i++) {
    // Zufällig viele Mauern, Schatz zufällig oder fehlend
    const mauern = alle.filter(() => zufall() < 0.4)
    const schatz = zufall() < 0.3 ? null : 'F6'
    const labyrinth = labyrinthVervollstaendigen({ schatz, mauern }, zufall)
    assertEquals(loesbarkeitPruefen(labyrinth).loesbar, true, `Lauf ${i}`)
    assert(labyrinth.mauern.every((m) => mauern.includes(m)), 'neue Mauer dazugekommen')
  }
})
