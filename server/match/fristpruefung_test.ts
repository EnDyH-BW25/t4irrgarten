import { assert, assertEquals } from '@std/assert'
import {
  anfrageStellen,
  bereitBestaetigen,
  COMPUTER,
  computerMatchErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
} from './ablauf.ts'
import { ABRUF_FRIST_MS, START_FRIST_MS, ZUG_FRIST_MS } from './fristen.ts'
import { abrufMerken, fristenPruefen } from './fristpruefung.ts'
import type { MatchIntern } from './typen.ts'

const NUTZER = { id: 'n1', name: 'Nudl' }
const JETZT = new Date('2026-11-15T10:00:00Z')
const ZUERST = () => 0

/** Zeitpunkt ms Millisekunden nach JETZT */
function nach(ms: number): Date {
  return new Date(JETZT.getTime() + ms)
}

/** Match im Status startbereit: Der Mensch hat gesetzt, der Computer ist bereit */
function startbereitesMatch(): MatchIntern {
  const match = computerMatchErstellen(NUTZER, 'standard', JETZT, ZUERST)
  match.spieler[1].entwurf = { schatz: 'A3', mauern: ['A1_B1'] }
  entwurfSpeichern(match, NUTZER.id, { schatz: 'F6', mauern: ['A1_A2'] })
  labyrinthSetzen(match, NUTZER.id, JETZT)
  return match
}

/** Laufendes Match ab JETZT; der Mensch ist am Zug */
function laufendesMatch(): MatchIntern {
  const match = startbereitesMatch()
  bereitBestaetigen(match, NUTZER.id, JETZT, ZUERST)
  return match
}

// ---------- Startfrist ----------

Deno.test('startfrist: vor Ablauf ändert sich nichts', () => {
  const match = startbereitesMatch()
  const version = match.version
  assertEquals(fristenPruefen(match, nach(START_FRIST_MS - 1)), false)
  assertEquals(match.status, 'startbereit')
  assertEquals(match.version, version)
})

Deno.test('startfrist: nur der Computer ist bereit, er gewinnt', () => {
  const match = startbereitesMatch()
  assertEquals(fristenPruefen(match, nach(START_FRIST_MS)), true)
  assertEquals(match.status, 'beendet')
  assertEquals(match.siegerId, COMPUTER.id)
  assertEquals(match.endegrund, 'startfrist')
  assertEquals(match.startFristEndeAm, null)
})

Deno.test('startfrist: keiner bereit, das Match bricht ohne Sieger ab', () => {
  // Im Modus computer ist der Computer immer bereit. Für den Fall aus dem Duell nehmen wir es zurück.
  const match = startbereitesMatch()
  match.spieler[1].startBestaetigt = false
  fristenPruefen(match, nach(START_FRIST_MS))
  assertEquals(match.status, 'abgebrochen')
  assertEquals(match.siegerId, null)
  assertEquals(match.endegrund, null)
})

// ---------- Zugfrist ----------

Deno.test('zugfrist: 60 Sekunden ohne Anfrage, der Spieler am Zug verliert', () => {
  const match = laufendesMatch()
  // Lebenszeichen kurz vor Ablauf, damit nur die Zugfrist greift
  abrufMerken(match, NUTZER.id, nach(ZUG_FRIST_MS - 1000))

  assertEquals(fristenPruefen(match, nach(ZUG_FRIST_MS - 1)), false)
  assertEquals(fristenPruefen(match, nach(ZUG_FRIST_MS)), true)
  assertEquals(match.siegerId, COMPUTER.id)
  assertEquals(match.endegrund, 'zugfrist')
  assertEquals(match.zugEndeAm, null)
  assertEquals(match.amZug, null)
})

Deno.test('zugfrist: eine Anfrage startet die Frist neu', () => {
  const match = laufendesMatch()
  anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, nach(50_000), ZUERST)
  abrufMerken(match, NUTZER.id, nach(100_000))
  fristenPruefen(match, nach(100_000))
  assertEquals(match.status, 'laeuft')
})

// ---------- Abruffrist ----------

Deno.test('abruffrist: 15 Sekunden ohne Abruf, der Spieler verliert wegen Abwesenheit', () => {
  const match = laufendesMatch()
  assertEquals(fristenPruefen(match, nach(ABRUF_FRIST_MS - 1)), false)
  assertEquals(fristenPruefen(match, nach(ABRUF_FRIST_MS)), true)
  assertEquals(match.siegerId, COMPUTER.id)
  assertEquals(match.endegrund, 'abwesenheit')
})

Deno.test('abruffrist: jeder Abruf schiebt sie hinaus und ändert die version nicht', () => {
  const match = laufendesMatch()
  const version = match.version
  for (let s = 10; s <= 50; s += 10) {
    fristenPruefen(match, nach(s * 1000))
    abrufMerken(match, NUTZER.id, nach(s * 1000))
  }
  assertEquals(match.status, 'laeuft')
  assertEquals(match.version, version)
})

Deno.test('abruffrist: Rückkehr nach langer Zeit zählt den frühesten Verstoß', () => {
  // Tab zu nach dem Start, zehn Minuten später ruft das Dashboard /current ab
  const match = laufendesMatch()
  fristenPruefen(match, nach(10 * 60_000))
  // Abwesenheit nach 15 Sekunden kam vor der Zugfrist nach 60 Sekunden
  assertEquals(match.endegrund, 'abwesenheit')
})

Deno.test('fristen: ein beendetes Match bleibt unverändert', () => {
  const match = laufendesMatch()
  fristenPruefen(match, nach(ABRUF_FRIST_MS))
  const version = match.version
  assertEquals(fristenPruefen(match, nach(60 * 60_000)), false)
  assertEquals(match.version, version)
  assert(match.status === 'beendet')
})
