import { assert, assertFalse } from '@std/assert'
import { istZelle } from './koordinaten.ts'

Deno.test('istZelle erkennt gültige Zellen', () => {
  for (const text of ['A1', 'C4', 'F6']) assert(istZelle(text), text)
})

Deno.test('istZelle lehnt ungültige Texte ab', () => {
  for (const text of ['G1', 'A7', 'A0', 'a1', 'A10', '', ' A1']) {
    assertFalse(istZelle(text), text)
  }
})
