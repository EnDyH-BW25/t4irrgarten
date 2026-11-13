import { assert, assertEquals } from '@std/assert'
import { type Mauer, MAX_MAUERN } from '../../shared/types.ts'
import { entwurfPruefen, loesbarkeitPruefen } from './regeln.ts'

// 30 verschiedene gültige Mauern: in jeder der 6 Zeilen die 5 Mauern zwischen den Spalten
const DREISSIG = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((z) =>
  [1, 2, 3, 4, 5].map((s) => `${z}${s}_${z}${s + 1}`)
)

// entwurfPruefen

Deno.test('gültiger Entwurf wird übernommen', () => {
  assertEquals(entwurfPruefen({ schatz: 'C4', mauern: ['A1_A2', 'B2_B3'] }), {
    ok: true,
    entwurf: { schatz: 'C4', mauern: ['A1_A2', 'B2_B3'] },
  })
})

Deno.test('Mauern werden vereinheitlicht', () => {
  const ergebnis = entwurfPruefen({ schatz: null, mauern: ['A2_A1'] })
  assert(ergebnis.ok)
  assertEquals(ergebnis.entwurf.mauern, ['A1_A2'])
})

Deno.test('ein Entwurf ohne Schatz ist erlaubt', () => {
  assert(entwurfPruefen({ schatz: null, mauern: [] }).ok)
})

Deno.test('ungültige Mauer wird mit ihrer Position gemeldet', () => {
  const ergebnis = entwurfPruefen({ schatz: null, mauern: ['A1_A2', 'A1_F6'] })
  assert(!ergebnis.ok)
  assertEquals(ergebnis.details.map((d) => d.feld), ['mauern[1]'])
})

Deno.test('doppelte Mauer wird auch in anderer Schreibweise erkannt', () => {
  const ergebnis = entwurfPruefen({ schatz: null, mauern: ['A1_A2', 'A2_A1'] })
  assert(!ergebnis.ok)
  assertEquals(ergebnis.details, [{ feld: 'mauern[1]', problem: 'Die Mauer A1_A2 ist doppelt.' }])
})

Deno.test('genau 30 verschiedene Mauern sind erlaubt', () => {
  assertEquals(DREISSIG.length, MAX_MAUERN)
  assert(entwurfPruefen({ schatz: null, mauern: DREISSIG }).ok)
})

Deno.test('31 Mauern sind zu viel', () => {
  const ergebnis = entwurfPruefen({ schatz: null, mauern: [...DREISSIG, 'A1_B1'] })
  assert(!ergebnis.ok)
  assertEquals(ergebnis.details.map((d) => d.feld), ['mauern'])
})

Deno.test('Schatz auf A1 ist verboten', () => {
  const ergebnis = entwurfPruefen({ schatz: 'A1', mauern: [] })
  assert(!ergebnis.ok)
  assertEquals(ergebnis.details.map((d) => d.feld), ['schatz'])
})

Deno.test('Schatz außerhalb des Rasters ist verboten', () => {
  assert(!entwurfPruefen({ schatz: 'G7', mauern: [] }).ok)
})

Deno.test('alle Probleme werden auf einmal gemeldet', () => {
  const ergebnis = entwurfPruefen({ schatz: 'A1', mauern: ['A1_A2', 'A2_A1', 'X9'] })
  assert(!ergebnis.ok)
  assertEquals(ergebnis.details.map((d) => d.feld), ['mauern[1]', 'mauern[2]', 'schatz'])
})

// loesbarkeitPruefen

Deno.test('ohne Schatz ist die Lösbarkeit offen', () => {
  assertEquals(loesbarkeitPruefen({ schatz: null, mauern: ['A1_A2'] }), {
    loesbar: null,
    meldung: null,
    problematischeMauern: [],
  })
})

Deno.test('erreichbarer Schatz ist lösbar', () => {
  assertEquals(loesbarkeitPruefen({ schatz: 'F6', mauern: [] }).loesbar, true)
})

Deno.test('erreichbar trotz Mauern am Rand liefert keine problematischen Mauern', () => {
  // Die Wand trennt Spalte 3 und 4, der Schatz liegt aber auf der Seite von A1
  const wand = ['A', 'B', 'C', 'D', 'E', 'F'].map((z) => `${z}3_${z}4` as Mauer)
  assertEquals(loesbarkeitPruefen({ schatz: 'C2', mauern: wand }), {
    loesbar: true,
    meldung: 'Schatz erreichbar',
    problematischeMauern: [],
  })
})

Deno.test('unerreichbarer Schatz markiert die Mauern am Rand', () => {
  assertEquals(loesbarkeitPruefen({ schatz: 'C4', mauern: ['A1_A2', 'A1_B1', 'C3_C4'] }), {
    loesbar: false,
    meldung: 'Schatz nicht erreichbar',
    problematischeMauern: ['A1_A2', 'A1_B1'],
  })
})
