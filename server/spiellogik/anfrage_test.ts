/**
 * UNIT-TESTS für anfrageAuswerten (Kernregel des Spiels)
 * Deno-Testrunner: Deno.test('Name', () => {...}), Start mit "deno task test".
 * Dateien mit _test.ts am Ende findet Deno automatisch.
 * Aufbau: ein kleines, festes Testlabyrinth, dann je Antwort mindestens ein Test.
 * Einteilung der Testfälle:
 *   falsche Eingabe  - diagonal, eigene Position => null
 *   Normalfall       - je ein Test für ja, nurBis, nein, schatzGefunden
 *   Grenzfall        - Mauer direkt HINTER dem Ziel, Schatz HINTER einer Mauer,
 *                      alle vier Laufrichtungen
 * Kein Mock nötig: reine Funktion, gleiche Eingabe => gleiche Ausgabe.
 */
import { assertEquals } from '@std/assert'
import type { Mauer } from '../../shared/types.ts'
import { anfrageAuswerten } from './anfrage.ts'

// Testlabyrinth: eine Mauer in Zeile A, Schatz weit weg in F6
//   A1 A2 A3 | A4 A5 A6     (| = Mauer A3_A4)
const MAUERN: Mauer[] = ['A3_A4']
const SCHATZ = 'F6'

// Ungültige Ziele (falsche Eingabe)

Deno.test('diagonales Ziel ist ungültig', () => {
  // assertEquals vergleicht den Inhalt (auch Objekte), wie toEqual in Vitest
  assertEquals(anfrageAuswerten('A1', 'B2', MAUERN, SCHATZ), null)
})

Deno.test('die eigene Position ist kein gültiges Ziel', () => {
  assertEquals(anfrageAuswerten('C3', 'C3', MAUERN, SCHATZ), null)
})

// ja (Normalfall)

Deno.test('ja bei einem Feld ohne Mauer', () => {
  assertEquals(anfrageAuswerten('A1', 'A2', MAUERN, SCHATZ), {
    ziel: 'A2',
    ergebnis: 'ja',
    position: 'A2',
    mauer: null,
  })
})

Deno.test('ja über mehrere Felder', () => {
  // ?. weil die Funktion null liefern kann; hier interessiert nur das Ergebnis
  assertEquals(anfrageAuswerten('A1', 'F1', MAUERN, SCHATZ)?.ergebnis, 'ja')
})

// Grenzfall: Die Figur stoppt auf A3, die Mauer A3_A4 dahinter darf sie nicht "sehen"
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
  // A1 -> A6 gewünscht, nach A3 kommt die Mauer: Figur steht auf A3
  assertEquals(anfrageAuswerten('A1', 'A6', MAUERN, SCHATZ), {
    ziel: 'A6',
    ergebnis: 'nurBis',
    position: 'A3',
    mauer: 'A3_A4',
  })
})

Deno.test('nein bei einer Mauer direkt vor dem Startfeld', () => {
  // Gleiche Mauer, aber die Figur steht schon auf A3: kein einziger Schritt möglich
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
  // Hier ein anderer Schatz (C1): Die Figur läuft nicht bis F1 weiter
  assertEquals(anfrageAuswerten('A1', 'F1', MAUERN, 'C1'), {
    ziel: 'F1',
    ergebnis: 'schatzGefunden',
    position: 'C1',
    mauer: null,
  })
})

// Grenzfall: Reihenfolge der Prüfungen im Code (erst Mauer, dann Schatz)
Deno.test('ein Schatz hinter einer Mauer bleibt verborgen', () => {
  // Erst die Mauer prüfen, dann den Schatz
  assertEquals(anfrageAuswerten('A1', 'A6', MAUERN, 'A5')?.ergebnis, 'nurBis')
})

// Richtungen: Die Mauer muss in jeder Laufrichtung erkannt werden
// Grund: Math.sign liefert -1 oder +1. Ein Vorzeichenfehler fiele nur in einer Richtung auf.

Deno.test('Mauer wird nach rechts, links, unten und oben erkannt', () => {
  const mauern: Mauer[] = ['D2_D3', 'B4_C4']
  assertEquals(anfrageAuswerten('D1', 'D6', mauern, SCHATZ)?.position, 'D2') // rechts
  assertEquals(anfrageAuswerten('D6', 'D1', mauern, SCHATZ)?.position, 'D3') // links
  assertEquals(anfrageAuswerten('A4', 'F4', mauern, SCHATZ)?.position, 'B4') // unten
  assertEquals(anfrageAuswerten('F4', 'A4', mauern, SCHATZ)?.position, 'C4') // oben
})
