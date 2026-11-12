import { assert, assertEquals, assertFalse } from '@std/assert'
import type { Zelle } from '../../shared/types.ts'
import { istZelle, parseMauer, sindNachbarn, zuPosition, zuZelle } from './koordinaten.ts'

Deno.test('istZelle erkennt gültige Zellen', () => {
  for (const text of ['A1', 'C4', 'F6']) assert(istZelle(text), text)
})

Deno.test('istZelle lehnt ungültige Texte ab', () => {
  for (const text of ['G1', 'A7', 'A0', 'a1', 'A10', '', ' A1']) {
    assertFalse(istZelle(text), text)
  }
})

Deno.test('zuPosition rechnet Zellen in Zahlen um', () => {
  assertEquals(zuPosition('A1'), { zeile: 0, spalte: 0 })
  assertEquals(zuPosition('C4'), { zeile: 2, spalte: 3 })
  assertEquals(zuPosition('F6'), { zeile: 5, spalte: 5 })
})

Deno.test('zuZelle liefert null außerhalb des Rasters', () => {
  for (const [z, s] of [[-1, 0], [0, -1], [6, 0], [0, 6], [1.5, 0]]) {
    assertEquals(zuZelle(z, s), null, `${z}/${s}`)
  }
})

Deno.test('zuZelle kehrt zuPosition für alle 36 Zellen um', () => {
  for (const z of ['A', 'B', 'C', 'D', 'E', 'F']) {
    for (let s = 1; s <= 6; s++) {
      const zelle = `${z}${s}` as Zelle
      const { zeile, spalte } = zuPosition(zelle)
      assertEquals(zuZelle(zeile, spalte), zelle)
    }
  }
})

Deno.test('sindNachbarn erkennt waagrechte und senkrechte Nachbarn', () => {
  assert(sindNachbarn('A1', 'A2'))
  assert(sindNachbarn('A1', 'B1'))
  assert(sindNachbarn('C4', 'B4'))
})

Deno.test('sindNachbarn lehnt diagonale, entfernte und gleiche Zellen ab', () => {
  const paare: [Zelle, Zelle][] = [['A1', 'B2'], ['A1', 'A3'], ['A1', 'F6'], ['A1', 'A1']]
  for (const [a, b] of paare) assertFalse(sindNachbarn(a, b), `${a}/${b}`)
})

Deno.test('parseMauer akzeptiert gültige Mauern', () => {
  assertEquals(parseMauer('A1_A2'), 'A1_A2')
  assertEquals(parseMauer('C4_D4'), 'C4_D4')
})

Deno.test('parseMauer vereinheitlicht die Reihenfolge', () => {
  assertEquals(parseMauer('A2_A1'), 'A1_A2')
  assertEquals(parseMauer('D4_C4'), 'C4_D4')
})

Deno.test('parseMauer lehnt ungültige Texte ab', () => {
  for (const text of ['A1_F6', 'A1_B2', 'A1_A1', 'G1_G2', 'A1-A2', 'A1_', 'A1A2', 'A1_A2_A3', '']) {
    assertEquals(parseMauer(text), null, text)
  }
})
