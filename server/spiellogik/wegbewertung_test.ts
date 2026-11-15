import { assertEquals, assertFalse } from '@std/assert'
import type { Mauer } from '../../shared/types.ts'
import { kuerzesteWege, schwererZuerst, wegBewerten } from './wegbewertung.ts'

// Mauern zwischen Zeile A und B: Zeile A wird zu einem geraden Gang
const GANG_A: Mauer[] = ['A1_B1', 'A2_B2', 'A3_B3', 'A4_B4', 'A5_B5', 'A6_B6']

Deno.test('kuerzesteWege: der Weg zur Startzelle ist nur die Startzelle', () => {
  assertEquals(kuerzesteWege([]).get('A1'), ['A1'])
})

Deno.test('kuerzesteWege: ohne Mauern führt ein Weg aus 6 Zellen nach A6', () => {
  assertEquals(kuerzesteWege([]).get('A6'), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
})

Deno.test('kuerzesteWege: eingemauerte Zellen haben keinen Weg', () => {
  assertFalse(kuerzesteWege(['A1_A2', 'A1_B1']).has('A2'))
})

Deno.test('wegBewerten: gerader Gang ohne Abbiegung und ohne Abzweigung', () => {
  const weg = kuerzesteWege(GANG_A).get('A6')!
  assertEquals(wegBewerten(weg, GANG_A), { laenge: 5, abbiegungen: 0, abzweigungen: 0 })
})

Deno.test('wegBewerten: zählt jeden Richtungswechsel', () => {
  // rechts, unten, rechts, unten: drei Wechsel
  const weg = wegBewerten(['A1', 'A2', 'B2', 'B3', 'C3'], [])
  assertEquals(weg.abbiegungen, 3)
})

Deno.test('wegBewerten: eine Öffnung im Gang ist eine Abzweigung', () => {
  const mauern = GANG_A.filter((m) => m !== 'A3_B3')
  const weg = kuerzesteWege(mauern).get('A6')!
  assertEquals(wegBewerten(weg, mauern).abzweigungen, 1)
})

Deno.test('wegBewerten: ohne Mauern zweigt an jeder Zelle etwas ab', () => {
  // A1 hat 2 Durchgänge (1 genutzt), A2 bis A5 haben je 3 (2 genutzt)
  assertEquals(wegBewerten(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], []).abzweigungen, 5)
})

Deno.test('schwererZuerst: höhere Wertung kommt zuerst', () => {
  const leicht = { laenge: 9, abbiegungen: 1, abzweigungen: 0 }
  const schwer = { laenge: 3, abbiegungen: 1, abzweigungen: 2 }
  assertEquals([leicht, schwer].sort(schwererZuerst), [schwer, leicht])
})

Deno.test('schwererZuerst: bei Gleichstand entscheidet die Weglänge', () => {
  const kurz = { laenge: 4, abbiegungen: 2, abzweigungen: 1 }
  const lang = { laenge: 7, abbiegungen: 1, abzweigungen: 2 }
  assertEquals([kurz, lang].sort(schwererZuerst), [lang, kurz])
})
