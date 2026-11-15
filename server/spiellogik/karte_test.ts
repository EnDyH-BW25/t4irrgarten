import { assertEquals } from '@std/assert'
import { karteFortschreiben, neueKarte } from './karte.ts'

Deno.test('neue Karte: Figur auf A1, nur A1 besucht, keine Mauer bekannt', () => {
  assertEquals(neueKarte(), { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] })
})

Deno.test('ja über drei Felder: alle Zellen der Strecke werden besucht', () => {
  const karte = karteFortschreiben(neueKarte(), {
    ziel: 'A4',
    ergebnis: 'ja',
    position: 'A4',
    mauer: null,
  })
  assertEquals(karte.position, 'A4')
  assertEquals(karte.besuchteZellen, ['A1', 'A2', 'A3', 'A4'])
  assertEquals(karte.entdeckteMauern, [])
})

Deno.test('nurBis: Strecke bis vor die Mauer, Mauer wird eingetragen', () => {
  const karte = karteFortschreiben(neueKarte(), {
    ziel: 'A6',
    ergebnis: 'nurBis',
    position: 'A3',
    mauer: 'A3_A4',
  })
  assertEquals(karte.position, 'A3')
  assertEquals(karte.besuchteZellen, ['A1', 'A2', 'A3'])
  assertEquals(karte.entdeckteMauern, ['A3_A4'])
})

Deno.test('nein: Figur bleibt stehen, nur die Mauer kommt dazu', () => {
  const karte = karteFortschreiben(neueKarte(), {
    ziel: 'C1',
    ergebnis: 'nein',
    position: 'A1',
    mauer: 'A1_B1',
  })
  assertEquals(karte.position, 'A1')
  assertEquals(karte.besuchteZellen, ['A1'])
  assertEquals(karte.entdeckteMauern, ['A1_B1'])
})

Deno.test('nach oben: Zellen kommen in Laufrichtung dazu, bekannte nicht doppelt', () => {
  const start = { position: 'C1' as const, besuchteZellen: ['A1', 'B1', 'C1'] as const }
  const karte = karteFortschreiben(
    { ...start, besuchteZellen: [...start.besuchteZellen], entdeckteMauern: [] },
    { ziel: 'A1', ergebnis: 'ja', position: 'A1', mauer: null },
  )
  assertEquals(karte.besuchteZellen, ['A1', 'B1', 'C1'])
})

Deno.test('eine bekannte Mauer wird nicht doppelt eingetragen', () => {
  const ergebnis = { ziel: 'A2', ergebnis: 'nein', position: 'A1', mauer: 'A1_A2' } as const
  const karte = karteFortschreiben(karteFortschreiben(neueKarte(), ergebnis), ergebnis)
  assertEquals(karte.entdeckteMauern, ['A1_A2'])
})

Deno.test('die alte Karte bleibt unverändert', () => {
  const alt = neueKarte()
  karteFortschreiben(alt, { ziel: 'A3', ergebnis: 'nurBis', position: 'A2', mauer: 'A2_A3' })
  assertEquals(alt, neueKarte())
})
