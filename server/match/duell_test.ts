import { assertEquals, assertThrows } from '@std/assert'
import type { FehlerCode } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import {
  anfrageStellen,
  AUFBAU_DAUER_MS,
  aufgeben,
  beitreten,
  bereitBestaetigen,
  duellErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
} from './ablauf.ts'
import { ansichtFuer } from './ansicht.ts'
import { ergebnisseAus } from './ergebnis.ts'
import { CODE_DAUER_MS, ZUG_FRIST_MS } from './fristen.ts'
import { fristenPruefen } from './fristpruefung.ts'
import type { MatchIntern } from './typen.ts'

const ANNA = { id: 'anna', name: 'Anna' }
const BEN = { id: 'ben', name: 'Ben' }
const JETZT = new Date('2026-11-16T10:00:00Z')
const ZUERST = () => 0 // Auslosung: der erste Spieler (Anna) beginnt

function nach(ms: number): Date {
  return new Date(JETZT.getTime() + ms)
}

function wirft(fn: () => unknown, status: number, code: FehlerCode) {
  const fehler = assertThrows(fn, ApiFehler)
  assertEquals([fehler.status, fehler.code], [status, code])
}

/** Duell im Spiel: Anna (Schatz F6) und Ben (Schatz A3, Mauer unter A1); Anna ist am Zug */
function laufendesDuell(): MatchIntern {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  beitreten(match, BEN, JETZT)
  entwurfSpeichern(match, ANNA.id, { schatz: 'F6', mauern: [] })
  entwurfSpeichern(match, BEN.id, { schatz: 'A3', mauern: ['A1_B1'] })
  labyrinthSetzen(match, ANNA.id, JETZT)
  labyrinthSetzen(match, BEN.id, JETZT)
  bereitBestaetigen(match, ANNA.id, JETZT, ZUERST)
  bereitBestaetigen(match, BEN.id, JETZT, ZUERST)
  return match
}

// ---------- Beitreten ----------

Deno.test('beitreten: zweiter Spieler kommt dazu, der Aufbau beginnt für beide', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  const spaeter = nach(2 * 60 * 1000)
  beitreten(match, BEN, spaeter)

  assertEquals(match.status, 'aufbau')
  assertEquals(match.spieler.map((s) => s.id), [ANNA.id, BEN.id])
  // Die drei Minuten zählen ab dem Beitritt, nicht ab dem Erstellen
  assertEquals(match.aufbauEndeAm!.getTime() - spaeter.getTime(), AUFBAU_DAUER_MS)
  assertEquals([match.code, match.codeEndeAm], [null, null])
  assertEquals(match.version, 2)
})

Deno.test('beitreten: dem eigenen Spiel beitreten ergibt 409', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  wirft(() => beitreten(match, ANNA, JETZT), 409, 'KONFLIKT')
})

Deno.test('beitreten: ein drittes Mal beitreten ergibt 409', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  beitreten(match, BEN, JETZT)
  wirft(() => beitreten(match, { id: 'cem', name: 'Cem' }, JETZT), 409, 'KONFLIKT')
})

// ---------- Warteraum: Ablauf und Abbrechen ----------

Deno.test('fristenPruefen: Code läuft nach 10 Minuten ohne Beitritt ab', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  assertEquals(fristenPruefen(match, nach(CODE_DAUER_MS - 1)), false)
  assertEquals(match.status, 'wartet')

  assertEquals(fristenPruefen(match, nach(CODE_DAUER_MS)), true)
  assertEquals(match.status, 'abgebrochen')
  assertEquals(match.code, null)
  assertEquals(ergebnisseAus(match), [])
})

Deno.test('aufgeben: im Warteraum bricht das Match ohne Ergebnis ab', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  aufgeben(match, ANNA.id, JETZT)
  assertEquals(match.status, 'abgebrochen')
  assertEquals(match.siegerId, null)
  assertEquals(match.code, null)
})

// ---------- Ansicht ----------

Deno.test('ansicht: im Warteraum Code und Restzeit, aber kein Gegner', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  const ansicht = ansichtFuer(match, ANNA.id, JETZT)

  assertEquals(ansicht.code, 'K7M2P')
  assertEquals(ansicht.codeEndeAm, nach(CODE_DAUER_MS).toISOString())
  assertEquals([ansicht.gegner, ansicht.gegnerKarte, ansicht.gegnerAnfragen], [null, null, null])
})

Deno.test('ansicht: nach dem Beitritt sehen beide keinen Code mehr', () => {
  const match = duellErstellen(ANNA, 'K7M2P', JETZT)
  beitreten(match, BEN, JETZT)
  for (const id of [ANNA.id, BEN.id]) assertEquals(ansichtFuer(match, id, JETZT).code, null)
})

// ---------- Spiel zwischen zwei Menschen ----------

Deno.test('Duell: Anfrage gegen eine Mauer gibt den Zug an den Menschen ab, ohne Computerzug', () => {
  const match = laufendesDuell()
  assertEquals(match.amZug, ANNA.id)

  // B1 liegt unter A1, dort steht Bens Mauer: nein
  const { ergebnis, computerAnfragen } = anfrageStellen(
    match,
    ANNA.id,
    { anfrageNr: 1, ziel: 'B1' },
    nach(5000),
  )
  assertEquals(ergebnis.ergebnis, 'nein')
  assertEquals(computerAnfragen, null)
  assertEquals(match.amZug, BEN.id)
  // Ohne Wiedergabe beginnt Bens Bedenkzeit sofort
  assertEquals(match.zugEndeAm!.getTime(), nach(5000 + ZUG_FRIST_MS).getTime())
})

Deno.test('Duell: Ben sieht Annas Anfrage live, Anna am Zug darf nicht doppelt fragen', () => {
  const match = laufendesDuell()
  anfrageStellen(match, ANNA.id, { anfrageNr: 1, ziel: 'B1' }, JETZT)

  const sichtBen = ansichtFuer(match, BEN.id, JETZT)
  assertEquals(sichtBen.gegnerAnfragen?.map((a) => [a.ziel, a.ergebnis]), [['B1', 'nein']])
  wirft(
    () => anfrageStellen(match, ANNA.id, { anfrageNr: 2, ziel: 'A2' }, JETZT),
    409,
    'NICHT_AM_ZUG',
  )
})

Deno.test('Duell: Schatz gefunden ergibt Ergebnisse für beide Menschen', () => {
  const match = laufendesDuell()
  anfrageStellen(match, ANNA.id, { anfrageNr: 1, ziel: 'A3' }, JETZT)

  assertEquals(match.siegerId, ANNA.id)
  const ergebnisse = ergebnisseAus(match)
  assertEquals(
    ergebnisse.map((e) => [e.nutzerId, e.ausgang, e.gegner]),
    [[ANNA.id, 'sieg', 'Ben'], [BEN.id, 'niederlage', 'Anna']],
  )
})
