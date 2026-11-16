import { assert, assertEquals, assertThrows } from '@std/assert'
import { ApiFehler } from '../fehler.ts'
import {
  anfrageStellen,
  computerMatchErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
} from './ablauf.ts'
import { ansichtFuer } from './ansicht.ts'
import type { Labyrinth } from '../../shared/types.ts'
import type { MatchIntern } from './typen.ts'

const NUTZER = { id: 'n1', name: 'Nudl' }
const JETZT = new Date('2026-11-15T10:00:00Z')
const ZUERST = () => 0

// Geheimes Labyrinth des Computers mit einer auffälligen Mauer, die wir im JSON suchen
const GEHEIM: Labyrinth = { schatz: 'A3', mauern: ['A1_B1'] }

/** Match im Aufbau; der Mensch hat einen Entwurf, der Computer das Labyrinth GEHEIM */
function matchImAufbau(): MatchIntern {
  const match = computerMatchErstellen(NUTZER, 'standard', JETZT, ZUERST)
  match.spieler[1].entwurf = structuredClone(GEHEIM)
  entwurfSpeichern(match, NUTZER.id, { schatz: 'F6', mauern: ['A1_A2'] })
  return match
}

/** Match im Spiel; der Mensch ist am Zug */
function laufendesMatch(): MatchIntern {
  const match = matchImAufbau()
  labyrinthSetzen(match, NUTZER.id, ZUERST)
  return match
}

/** Sucht im fertigen JSON. So fällt auch ein Leck in einem Feld auf, das wir nicht kennen. */
function verraetGeheimnis(match: MatchIntern): boolean {
  const json = JSON.stringify(ansichtFuer(match, NUTZER.id, JETZT))
  return json.includes('A1_B1') || json.includes('"A3"')
}

Deno.test('ansicht: Aufbau zeigt Fristen als Text, eigenen Entwurf und Prüfung', () => {
  const match = matchImAufbau()
  const ansicht = ansichtFuer(match, NUTZER.id, JETZT)

  assertEquals(ansicht.serverZeit, '2026-11-15T10:00:00.000Z')
  assertEquals(ansicht.aufbauEndeAm, '2026-11-15T10:03:00.000Z')
  assertEquals(ansicht.meinLabyrinth, { schatz: 'F6', mauern: ['A1_A2'] })
  assertEquals(ansicht.pruefung?.loesbar, true)
  assertEquals(ansicht.ich.labyrinthGesetzt, false)
  assertEquals(ansicht.gegner?.labyrinthGesetzt, true)
})

Deno.test('ansicht: Spieler enthalten nur id, name und istComputer', () => {
  const ansicht = ansichtFuer(matchImAufbau(), NUTZER.id, JETZT)
  assertEquals(ansicht.spieler, [
    { id: 'n1', name: 'Nudl', istComputer: false },
    { id: 'computer', name: 'Computer', istComputer: true },
  ])
})

Deno.test('ansicht: Felder ohne Wert sind null und fehlen nie', () => {
  const ansicht = ansichtFuer(matchImAufbau(), NUTZER.id, JETZT)
  for (
    const feld of [
      'code',
      'competitionId',
      'startFristEndeAm',
      'zugEndeAm',
      'amZug',
      'siegerId',
    ] as const
  ) {
    assert(feld in ansicht, `${feld} fehlt`)
    assertEquals(ansicht[feld], null)
  }
})

Deno.test('ansicht: im Spiel keine Prüfung und keine Aufbaufrist mehr', () => {
  const ansicht = ansichtFuer(laufendesMatch(), NUTZER.id, JETZT)
  assertEquals(ansicht.status, 'laeuft')
  assertEquals(ansicht.pruefung, null)
  assertEquals(ansicht.aufbauEndeAm, null)
  assertEquals(ansicht.amZug, NUTZER.id)
})

Deno.test('ansicht: Labyrinth des Gegners bleibt im Aufbau und im Spiel geheim', () => {
  const match = matchImAufbau()
  assertEquals(ansichtFuer(match, NUTZER.id, JETZT).gegnerLabyrinth, null)
  assert(!verraetGeheimnis(match), 'Aufbau verrät das Labyrinth')

  labyrinthSetzen(match, NUTZER.id, ZUERST)
  assertEquals(ansichtFuer(match, NUTZER.id, JETZT).gegnerLabyrinth, null)
  assert(!verraetGeheimnis(match), 'Spiel verrät das Labyrinth')
})

Deno.test('ansicht: Karten zeigen den Fortschritt beider Seiten', () => {
  const match = laufendesMatch()
  // F1 stößt an A1_B1: nein, danach spielt der Computer
  anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'F1' }, ZUERST)
  const ansicht = ansichtFuer(match, NUTZER.id, JETZT)

  assertEquals(ansicht.bekannteKarte.entdeckteMauern, ['A1_B1'])
  assertEquals(ansicht.gegnerKarte?.entdeckteMauern, ['A1_A2'])
})

Deno.test('ansicht: nach Spielende ist das Labyrinth des Gegners sichtbar', () => {
  const match = laufendesMatch()
  anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A3' }, ZUERST)
  const ansicht = ansichtFuer(match, NUTZER.id, JETZT)

  assertEquals(ansicht.status, 'beendet')
  assertEquals(ansicht.siegerId, NUTZER.id)
  assertEquals(ansicht.endegrund, 'schatz')
  assertEquals(ansicht.gegnerLabyrinth, GEHEIM)
})

Deno.test('ansicht: fremder Nutzer erhält 403', () => {
  const fehler = assertThrows(() => ansichtFuer(matchImAufbau(), 'fremd', JETZT), ApiFehler)
  assertEquals(fehler.status, 403)
})
