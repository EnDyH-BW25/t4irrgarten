import { assert, assertEquals, assertFalse } from '@std/assert'
import type { Mauer } from '../../shared/types.ts'
import { abstaende, erreichbareZellen, problematischeMauern } from './erreichbarkeit.ts'

const ZEILEN = ['A', 'B', 'C', 'D', 'E', 'F']

Deno.test('ohne Mauern sind alle 36 Zellen erreichbar', () => {
  assertEquals(erreichbareZellen([]).size, 36)
})

Deno.test('eine einzelne Mauer lässt sich umgehen', () => {
  // A2 ist über B1 und B2 trotzdem erreichbar
  const erreichbar = erreichbareZellen(['A1_A2'])
  assert(erreichbar.has('A2'))
  assertEquals(erreichbar.size, 36)
})

Deno.test('eingemauertes A1 erreicht nur sich selbst', () => {
  assertEquals(erreichbareZellen(['A1_A2', 'A1_B1']), new Set(['A1']))
})

Deno.test('eine durchgehende Wand teilt das Feld', () => {
  // Wand zwischen Spalte 3 und 4 über alle sechs Zeilen
  const wand = ZEILEN.map((z) => `${z}3_${z}4` as Mauer)
  const erreichbar = erreichbareZellen(wand)
  assertEquals(erreichbar.size, 18)
  assert(erreichbar.has('F3'))
  assertFalse(erreichbar.has('A4'))
})

Deno.test('eine Wand mit Lücke lässt den Weg offen', () => {
  // Wie oben, aber zwischen F3 und F4 fehlt die Mauer
  const wand = ZEILEN.slice(0, 5).map((z) => `${z}3_${z}4` as Mauer)
  assertEquals(erreichbareZellen(wand).size, 36)
})

// Kurzform: erst Breitensuche, dann problematische Mauern bestimmen
function problematisch(mauern: Mauer[]): Mauer[] {
  return problematischeMauern(mauern, erreichbareZellen(mauern))
}

Deno.test('ohne Mauern gibt es keine problematischen Mauern', () => {
  assertEquals(problematisch([]), [])
})

Deno.test('beide Mauern um ein eingemauertes A1 sind problematisch', () => {
  assertEquals(problematisch(['A1_A2', 'A1_B1']), ['A1_A2', 'A1_B1'])
})

Deno.test('nur die Mauern auf der Grenze sind problematisch', () => {
  const wand = ZEILEN.map((z) => `${z}3_${z}4` as Mauer)
  // A1_A2 liegt im erreichbaren Bereich, A5_A6 dahinter: beide nicht problematisch
  assertEquals(problematisch(['A1_A2', ...wand, 'A5_A6']), wand)
})

Deno.test('abstaende: ohne Mauern liegt F6 zehn Schritte von A1 entfernt', () => {
  const abstand = abstaende([])
  assertEquals(abstand.get('A1'), 0)
  assertEquals(abstand.get('B2'), 2)
  assertEquals(abstand.get('F6'), 10)
})

Deno.test('abstaende: eine Mauer erzwingt einen Umweg', () => {
  // A1 -> B1 -> B2 -> A2 statt direkt nach A2
  assertEquals(abstaende(['A1_A2']).get('A2'), 3)
})

Deno.test('abstaende: eingemauerte Zellen fehlen in der Liste', () => {
  const abstand = abstaende(['A1_A2', 'A1_B1'])
  assertEquals(abstand.size, 1)
  assertFalse(abstand.has('A2'))
})
