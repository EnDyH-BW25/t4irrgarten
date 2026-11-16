import { assert, assertEquals } from '@std/assert'
import { festerZufall } from '../testHilfen.ts'
import {
  CODE_LAENGE,
  CODE_ZEICHEN,
  codeErzeugen,
  codeNormieren,
  freienCodeErzeugen,
} from './spielcode.ts'

Deno.test('codeErzeugen: fünf Zeichen aus dem erlaubten Vorrat', () => {
  const zufall = festerZufall(1)
  // Viele Läufe, damit jedes Zeichen einmal vorkommt
  for (let i = 0; i < 500; i++) {
    const code = codeErzeugen(zufall)
    assertEquals(code.length, CODE_LAENGE)
    for (const z of code) assert(CODE_ZEICHEN.includes(z), `unerlaubtes Zeichen ${z}`)
  }
})

Deno.test('codeErzeugen: verwechselbare Zeichen kommen nie vor', () => {
  for (const z of ['0', 'O', '1', 'I']) assert(!CODE_ZEICHEN.includes(z))
})

Deno.test('codeErzeugen: Grenzwerte des Zufalls ergeben erstes und letztes Zeichen', () => {
  assertEquals(codeErzeugen(() => 0), 'AAAAA')
  assertEquals(codeErzeugen(() => 0.9999), '99999')
})

Deno.test('freienCodeErzeugen: überspringt vergebene Codes', () => {
  // Erst 0 ergibt AAAAA (vergeben), danach 0.9999 ergibt 99999
  const werte = [0, 0, 0, 0, 0, 0.9999, 0.9999, 0.9999, 0.9999, 0.9999]
  const code = freienCodeErzeugen((c) => c === 'AAAAA', () => werte.shift()!)
  assertEquals(code, '99999')
})

Deno.test('codeNormieren: Leerzeichen weg, Großbuchstaben', () => {
  assertEquals(codeNormieren(' k7m2p '), 'K7M2P')
})
