import { assertEquals, assertStrictEquals } from '@std/assert'
import { computerMatchErstellen, duellErstellen } from './ablauf.ts'
import { MatchSpeicher } from './speicher.ts'

const JETZT = new Date('2026-11-15T10:00:00Z')
const NUDL = { id: 'n1', name: 'Nudl' }
const KNOEDEL = { id: 'n2', name: 'Knödel' }

Deno.test('holen: liefert genau das angelegte Objekt unter seiner Id', () => {
  const speicher = new MatchSpeicher()
  const match = computerMatchErstellen(NUDL, 'einfach', JETZT)
  speicher.anlegen(match)
  // Dasselbe Objekt, keine Kopie: Änderungen der Match-Schicht landen sofort im Speicher
  assertStrictEquals(speicher.holen(match.id), match)
})

Deno.test('holen: Änderungen am Match sind danach sichtbar', () => {
  const speicher = new MatchSpeicher()
  const match = computerMatchErstellen(NUDL, 'einfach', JETZT)
  speicher.anlegen(match)
  match.version++
  assertEquals(speicher.holen(match.id)?.version, 2)
  // Date bleibt Date und wird nicht zu Text
  assertEquals(speicher.holen(match.id)?.aufbauEndeAm instanceof Date, true)
})

Deno.test('holen: unbekannte Id ergibt null', () => {
  assertEquals(new MatchSpeicher().holen('ausgedacht'), null)
})

Deno.test('offenesMatchVon: findet das Match des Nutzers, nicht das eines anderen', () => {
  const speicher = new MatchSpeicher()
  const vonNudl = computerMatchErstellen(NUDL, 'einfach', JETZT)
  const vonKnoedel = computerMatchErstellen(KNOEDEL, 'schwer', JETZT)
  speicher.anlegen(vonNudl)
  speicher.anlegen(vonKnoedel)
  assertStrictEquals(speicher.offenesMatchVon('n1'), vonNudl)
  assertStrictEquals(speicher.offenesMatchVon('n2'), vonKnoedel)
})

Deno.test('offenesMatchVon: Nutzer ohne Match ergibt null', () => {
  const speicher = new MatchSpeicher()
  speicher.anlegen(computerMatchErstellen(NUDL, 'einfach', JETZT))
  assertEquals(speicher.offenesMatchVon('n2'), null)
})

Deno.test('offenesMatchVon: beendete und abgebrochene Matches zählen nicht', () => {
  for (const status of ['beendet', 'abgebrochen'] as const) {
    const speicher = new MatchSpeicher()
    const match = computerMatchErstellen(NUDL, 'einfach', JETZT)
    match.status = status
    speicher.anlegen(match)
    assertEquals(speicher.offenesMatchVon('n1'), null, status)
  }
})

Deno.test('offenesMatchVon: neben alten Matches findet es das offene', () => {
  const speicher = new MatchSpeicher()
  const alt = computerMatchErstellen(NUDL, 'einfach', JETZT)
  alt.status = 'beendet'
  const neu = computerMatchErstellen(NUDL, 'standard', JETZT)
  speicher.anlegen(alt)
  speicher.anlegen(neu)
  assertStrictEquals(speicher.offenesMatchVon('n1'), neu)
})

Deno.test('nachCode: findet nur ein wartendes Duell mit genau diesem Code', () => {
  const speicher = new MatchSpeicher()
  const duell = duellErstellen(NUDL, 'K7M2P', JETZT)
  speicher.anlegen(duell)

  assertStrictEquals(speicher.nachCode('K7M2P'), duell)
  assertEquals(speicher.nachCode('ABCDE'), null)
  // Nach dem Beitritt ist das Match nicht mehr im Status wartet: Der Code gilt nicht mehr
  duell.status = 'aufbau'
  assertEquals(speicher.nachCode('K7M2P'), null)
})

Deno.test('offenesMatchVon: ein wartendes Duell zählt als offen', () => {
  const speicher = new MatchSpeicher()
  speicher.anlegen(duellErstellen(NUDL, 'K7M2P', JETZT))
  assertEquals(speicher.offenesMatchVon(NUDL.id)?.status, 'wartet')
})
