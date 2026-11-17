import { assert, assertEquals, assertThrows } from '@std/assert'
import type { FehlerCode } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { festerZufall } from '../testHilfen.ts'
import {
  codefristPruefen,
  TURNIER_CODE_DAUER_MS,
  turnierBeitreten,
  turnierErstellen,
  turnierStarten,
  turnierVerlassen,
} from './ablauf.ts'
import { TurnierSpeicher } from './speicher.ts'
import type { TurnierIntern } from './typen.ts'

const ANNA = { id: 'anna', name: 'Anna' }
const BEN = { id: 'ben', name: 'Ben' }
const CLARA = { id: 'clara', name: 'Clara' }
const DAVID = { id: 'david', name: 'David' }
const EMMA = { id: 'emma', name: 'Emma' }
const JETZT = new Date('2026-11-17T10:00:00Z')

function wirft(fn: () => unknown, status: number, code: FehlerCode) {
  const fehler = assertThrows(fn, ApiFehler)
  assertEquals([fehler.status, fehler.code], [status, code])
}

/** Turnier von Anna (Host) mit den angegebenen weiteren Teilnehmern */
function warteraum(...weitere: { id: string; name: string }[]): TurnierIntern {
  const turnier = turnierErstellen(ANNA, 'schwer', 'H3R8W', JETZT)
  for (const n of weitere) turnierBeitreten(turnier, n)
  return turnier
}

// ---------- Warteraum ----------

Deno.test('turnierErstellen: Host ist erster Teilnehmer, Code gilt 30 Minuten', () => {
  const turnier = warteraum()
  assertEquals(turnier.status, 'wartet')
  assertEquals(turnier.hostId, 'anna')
  assertEquals(turnier.teilnehmer.map((t) => t.id), ['anna'])
  assertEquals(turnier.codeEndeAm!.getTime() - JETZT.getTime(), TURNIER_CODE_DAUER_MS)
})

Deno.test('turnierBeitreten: Normalfall, doppelt und voll', () => {
  const turnier = warteraum(BEN, CLARA, DAVID)
  assertEquals(turnier.teilnehmer.length, 4)
  wirft(() => turnierBeitreten(turnier, BEN), 409, 'KONFLIKT')
  wirft(() => turnierBeitreten(turnier, EMMA), 409, 'COMPETITION_VOLL')
})

Deno.test('turnierBeitreten: nach dem Start nicht mehr möglich', () => {
  const turnier = warteraum(BEN, CLARA)
  turnierStarten(turnier, ANNA.id, JETZT, festerZufall(1))
  wirft(() => turnierBeitreten(turnier, DAVID), 409, 'COMPETITION_VOLL')
})

Deno.test('turnierVerlassen: Teilnehmer geht, Turnier bleibt', () => {
  const turnier = warteraum(BEN, CLARA)
  turnierVerlassen(turnier, BEN.id)
  assertEquals(turnier.teilnehmer.map((t) => t.id), ['anna', 'clara'])
  assertEquals(turnier.status, 'wartet')
})

Deno.test('turnierVerlassen: Host geht, Turnier endet und Code wird ungültig', () => {
  const turnier = warteraum(BEN)
  turnierVerlassen(turnier, ANNA.id)
  assertEquals(turnier.status, 'abgebrochen')
  assertEquals(turnier.code, null)
})

Deno.test('turnierVerlassen: Fremde 403, nach dem Start 409', () => {
  const turnier = warteraum(BEN, CLARA)
  wirft(() => turnierVerlassen(turnier, EMMA.id), 403, 'VERBOTEN')
  turnierStarten(turnier, ANNA.id, JETZT, festerZufall(1))
  wirft(() => turnierVerlassen(turnier, BEN.id), 409, 'KONFLIKT')
})

Deno.test('codefristPruefen: kurz vor Ablauf nichts, danach abgebrochen', () => {
  const turnier = warteraum(BEN)
  assertEquals(
    codefristPruefen(turnier, new Date(JETZT.getTime() + TURNIER_CODE_DAUER_MS - 1)),
    false,
  )
  assertEquals(turnier.status, 'wartet')
  assertEquals(codefristPruefen(turnier, new Date(JETZT.getTime() + TURNIER_CODE_DAUER_MS)), true)
  assertEquals(turnier.status, 'abgebrochen')
})

// ---------- Start ----------

Deno.test('turnierStarten: nur der Host, ab drei Spielern', () => {
  const turnier = warteraum(BEN)
  wirft(() => turnierStarten(turnier, BEN.id, JETZT), 403, 'VERBOTEN')
  wirft(() => turnierStarten(turnier, ANNA.id, JETZT), 409, 'ZU_WENIG_SPIELER')
  assertEquals(turnier.status, 'wartet')
})

Deno.test('turnierStarten: drei Spieler, der Computer füllt auf und spielt gegen einen Menschen', () => {
  // Mehrere Startwerte: Die Auslosung darf den Computer nie gegen sich selbst setzen
  for (let startwert = 1; startwert <= 20; startwert++) {
    const turnier = warteraum(BEN, CLARA)
    const matches = turnierStarten(turnier, ANNA.id, JETZT, festerZufall(startwert))

    assertEquals(turnier.status, 'laeuft')
    assertEquals(turnier.code, null)
    assertEquals(turnier.teilnehmer.filter((t) => t.istComputer).length, 1)
    assertEquals(matches.length, 2)

    const computerMatch = matches.filter((m) => m.modus === 'computer')
    assertEquals(computerMatch.length, 1)
    assertEquals(computerMatch[0].schwierigkeit, 'schwer') // Schwierigkeit des Hosts
    // Jeder der vier spielt genau ein Match
    const ids = matches.flatMap((m) => m.spieler.map((s) => s.id)).sort()
    assertEquals(ids, ['anna', 'ben', 'clara', 'computer'])
  }
})

Deno.test('turnierStarten: vier Menschen, kein Computer, zwei Duelle direkt im Aufbau', () => {
  const turnier = warteraum(BEN, CLARA, DAVID)
  const matches = turnierStarten(turnier, ANNA.id, JETZT, festerZufall(3))

  assert(turnier.teilnehmer.every((t) => !t.istComputer))
  for (const m of matches) {
    assertEquals([m.modus, m.status, m.code], ['duell', 'aufbau', null])
    assertEquals([m.competitionId, m.runde], [turnier.id, 1])
  }
  assertEquals(turnier.runden.length, 1)
  assertEquals(turnier.runden[0].map((p) => p.matchId), matches.map((m) => m.id))
})

Deno.test('turnierStarten: zweiter Start ist ein Konflikt', () => {
  const turnier = warteraum(BEN, CLARA)
  turnierStarten(turnier, ANNA.id, JETZT, festerZufall(1))
  wirft(() => turnierStarten(turnier, ANNA.id, JETZT), 409, 'KONFLIKT')
})

// ---------- Speicher ----------

Deno.test('TurnierSpeicher: Code nur im Warteraum, offenes Turnier bis zum Ende', () => {
  const speicher = new TurnierSpeicher()
  const turnier = warteraum(BEN, CLARA)
  speicher.anlegen(turnier)

  assertEquals(speicher.nachCode('H3R8W')?.id, turnier.id)
  assertEquals(speicher.offenesTurnierVon('ben')?.id, turnier.id)
  assertEquals(speicher.offenesTurnierVon('emma'), null)

  turnierStarten(turnier, ANNA.id, JETZT, festerZufall(1))
  assertEquals(speicher.nachCode('H3R8W'), null)
  assertEquals(speicher.offenesTurnierVon('ben')?.id, turnier.id)

  turnier.status = 'beendet'
  assertEquals(speicher.offenesTurnierVon('ben'), null)
})
