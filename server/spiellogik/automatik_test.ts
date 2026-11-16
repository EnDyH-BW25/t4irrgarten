import { assert, assertEquals } from '@std/assert'
import type { Mauer } from '../../shared/types.ts'
import { festerZufall } from '../testHilfen.ts'
import { zufaelligerSchatz } from './automatik.ts'
import { erreichbareZellen } from './erreichbarkeit.ts'

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
