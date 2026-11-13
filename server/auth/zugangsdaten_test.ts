import { assertEquals } from '@std/assert'
import { zugangsdatenPruefen } from './zugangsdaten.ts'

/** Liefert nur die Felder mit Problemen, damit Tests kurz bleiben */
function fehlerFelder(eingabe: unknown): string[] {
  const ergebnis = zugangsdatenPruefen(eingabe)
  return ergebnis.ok ? [] : ergebnis.details.map((d) => d.feld)
}

Deno.test('zugangsdatenPruefen: gültige Eingabe', () => {
  assertEquals(zugangsdatenPruefen({ name: 'nudl', passwort: 'geheim1234' }), {
    ok: true,
    zugangsdaten: { name: 'nudl', passwort: 'geheim1234' },
  })
})

Deno.test('zugangsdatenPruefen: Name ohne Leerzeichen am Rand, Passwort unverändert', () => {
  const ergebnis = zugangsdatenPruefen({ name: '  nudl ', passwort: ' geheim1234 ' })
  assertEquals(ergebnis.ok && ergebnis.zugangsdaten, { name: 'nudl', passwort: ' geheim1234 ' })
})

Deno.test('zugangsdatenPruefen: Grenzen der Namenslänge', () => {
  assertEquals(fehlerFelder({ name: 'abc', passwort: 'geheim1234' }), [])
  assertEquals(fehlerFelder({ name: 'a'.repeat(20), passwort: 'geheim1234' }), [])
  assertEquals(fehlerFelder({ name: 'ab', passwort: 'geheim1234' }), ['name'])
  assertEquals(fehlerFelder({ name: 'a'.repeat(21), passwort: 'geheim1234' }), ['name'])
  assertEquals(fehlerFelder({ name: '   ab   ', passwort: 'geheim1234' }), ['name'])
})

Deno.test('zugangsdatenPruefen: Grenzen der Passwortlänge', () => {
  assertEquals(fehlerFelder({ name: 'nudl', passwort: '12345678' }), [])
  assertEquals(fehlerFelder({ name: 'nudl', passwort: 'x'.repeat(100) }), [])
  assertEquals(fehlerFelder({ name: 'nudl', passwort: '1234567' }), ['passwort'])
  assertEquals(fehlerFelder({ name: 'nudl', passwort: 'x'.repeat(101) }), ['passwort'])
})

Deno.test('zugangsdatenPruefen: fehlende oder falsche Typen', () => {
  assertEquals(fehlerFelder({}), ['name', 'passwort'])
  assertEquals(fehlerFelder({ name: 1234, passwort: 12345678 }), ['name', 'passwort'])
})

Deno.test('zugangsdatenPruefen: kein Objekt', () => {
  for (const eingabe of [null, 'nudl', 42, ['nudl', 'geheim1234']]) {
    assertEquals(fehlerFelder(eingabe), ['body'])
  }
})
