import { assertEquals } from '@std/assert'
import type { Mauer } from '../../shared/types.ts'
import { anfrageAuswerten } from './anfrage.ts'

// Testlabyrinth: eine Mauer in Zeile A, Schatz weit weg in F6
const MAUERN: Mauer[] = ['A3_A4']
const SCHATZ = 'F6'

// Ungültige Ziele

Deno.test('diagonales Ziel ist ungültig', () => {
  assertEquals(anfrageAuswerten('A1', 'B2', MAUERN, SCHATZ), null)
})

Deno.test('die eigene Position ist kein gültiges Ziel', () => {
  assertEquals(anfrageAuswerten('C3', 'C3', MAUERN, SCHATZ), null)
})

// ja

Deno.test('ja bei einem Feld ohne Mauer', () => {
  assertEquals(anfrageAuswerten('A1', 'A2', MAUERN, SCHATZ), {
    ziel: 'A2',
    ergebnis: 'ja',
    position: 'A2',
    mauer: null,
  })
})

Deno.test('ja über mehrere Felder', () => {
  assertEquals(anfrageAuswerten('A1', 'F1', MAUERN, SCHATZ)?.ergebnis, 'ja')
})

Deno.test('eine Mauer hinter dem Ziel bleibt unentdeckt', () => {
  assertEquals(anfrageAuswerten('A1', 'A3', MAUERN, SCHATZ), {
    ziel: 'A3',
    ergebnis: 'ja',
    position: 'A3',
    mauer: null,
  })
})

// nurBis und nein

Deno.test('nurBis stoppt vor der Mauer auf der Strecke', () => {
  assertEquals(anfrageAuswerten('A1', 'A6', MAUERN, SCHATZ), {
    ziel: 'A6',
    ergebnis: 'nurBis',
    position: 'A3',
    mauer: 'A3_A4',
  })
})

Deno.test('nein bei einer Mauer direkt vor dem Startfeld', () => {
  assertEquals(anfrageAuswerten('A3', 'A5', MAUERN, SCHATZ), {
    ziel: 'A5',
    ergebnis: 'nein',
    position: 'A3',
    mauer: 'A3_A4',
  })
})

// schatzGefunden

Deno.test('schatzGefunden, wenn der Schatz auf dem Ziel liegt', () => {
  assertEquals(anfrageAuswerten('F1', 'F6', MAUERN, SCHATZ), {
    ziel: 'F6',
    ergebnis: 'schatzGefunden',
    position: 'F6',
    mauer: null,
  })
})

Deno.test('schatzGefunden stoppt auf dem Schatz vor dem Ziel', () => {
  assertEquals(anfrageAuswerten('A1', 'F1', MAUERN, 'C1'), {
    ziel: 'F1',
    ergebnis: 'schatzGefunden',
    position: 'C1',
    mauer: null,
  })
})

Deno.test('ein Schatz hinter einer Mauer bleibt verborgen', () => {
  // Erst die Mauer prüfen, dann den Schatz
  assertEquals(anfrageAuswerten('A1', 'A6', MAUERN, 'A5')?.ergebnis, 'nurBis')
})

// Richtungen: Die Mauer muss in jeder Laufrichtung erkannt werden

Deno.test('Mauer wird nach rechts, links, unten und oben erkannt', () => {
  const mauern: Mauer[] = ['D2_D3', 'B4_C4']
  assertEquals(anfrageAuswerten('D1', 'D6', mauern, SCHATZ)?.position, 'D2') // rechts
  assertEquals(anfrageAuswerten('D6', 'D1', mauern, SCHATZ)?.position, 'D3') // links
  assertEquals(anfrageAuswerten('A4', 'F4', mauern, SCHATZ)?.position, 'B4') // unten
  assertEquals(anfrageAuswerten('F4', 'A4', mauern, SCHATZ)?.position, 'C4') // oben
})
