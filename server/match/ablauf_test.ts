import { assert, assertEquals, assertThrows } from '@std/assert'
import { type FehlerCode, type Labyrinth, WIEDERGABE_PAUSE_MS } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { loesbarkeitPruefen } from '../spiellogik/regeln.ts'
import { zielWaehlen } from '../spiellogik/sucher.ts'
import { festerZufall } from '../testHilfen.ts'
import {
  anfrageStellen,
  AUFBAU_DAUER_MS,
  aufgeben,
  bereitBestaetigen,
  COMPUTER,
  computerMatchErstellen,
  duellErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
  teilnehmer,
} from './ablauf.ts'
import { CODE_DAUER_MS, START_FRIST_MS, ZUG_FRIST_MS } from './fristen.ts'
import type { MatchIntern } from './typen.ts'

const NUTZER = { id: 'n1', name: 'Nudl' }
const JETZT = new Date('2026-11-15T10:00:00Z')

// Zufall 0 wählt immer das erste Element: Der Mensch beginnt, der Computer fragt zuerst nach rechts
const ZUERST = () => 0
// Zufall knapp unter 1 wählt immer das letzte Element: Der Computer beginnt
const ZULETZT = () => 0.99

/** Prüft, ob die Funktion einen ApiFehler mit Status und Code wirft */
function wirft(fn: () => unknown, status: number, code: FehlerCode): ApiFehler {
  const fehler = assertThrows(fn, ApiFehler)
  assertEquals([fehler.status, fehler.code], [status, code])
  return fehler
}

/**
 * Match mit bekanntem Computer-Labyrinth: Schatz auf A3, A1 nach unten zu.
 * Der Mensch hat Schatz F6 und eine Mauer rechts von A1.
 */
function vorbereitetesMatch(): MatchIntern {
  const match = computerMatchErstellen(NUTZER, 'standard', JETZT, festerZufall(1))
  const computerLabyrinth: Labyrinth = { schatz: 'A3', mauern: ['A1_B1'] }
  match.spieler[1].entwurf = computerLabyrinth
  entwurfSpeichern(match, NUTZER.id, { schatz: 'F6', mauern: ['A1_A2'] })
  return match
}

// ---------- 4.1 Erstellen ----------

Deno.test('erstellen: Aufbau läuft, Computer hat ein lösbares Labyrinth gesetzt', () => {
  const match = computerMatchErstellen(NUTZER, 'schwer', JETZT, festerZufall(1))
  assertEquals(match.status, 'aufbau')
  assertEquals(match.version, 1)
  assertEquals(match.anfrageNr, 1)
  assertEquals(match.amZug, null)
  assertEquals(match.aufbauEndeAm!.getTime(), JETZT.getTime() + AUFBAU_DAUER_MS)

  const [mensch, computer] = match.spieler
  assertEquals(mensch.entwurf, { schatz: null, mauern: [] })
  assertEquals(mensch.gesetzt, false)
  assertEquals(computer.id, COMPUTER.id)
  assert(computer.gesetzt)
  assertEquals(loesbarkeitPruefen(computer.entwurf).loesbar, true)
})

Deno.test('teilnehmer: fremder Nutzer erhält 403', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  wirft(() => teilnehmer(match, 'fremd'), 403, 'VERBOTEN')
})

// ---------- 4.2 Aufbau ----------

Deno.test('entwurfSpeichern: vereinheitlicht Mauern und erhöht die Version', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  entwurfSpeichern(match, NUTZER.id, { schatz: 'C4', mauern: ['A2_A1'] })
  assertEquals(match.spieler[0].entwurf, { schatz: 'C4', mauern: ['A1_A2'] })
  assertEquals(match.version, 2)
})

Deno.test('entwurfSpeichern: ein unlösbarer Entwurf bleibt gespeichert', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  entwurfSpeichern(match, NUTZER.id, { schatz: 'C4', mauern: ['A1_A2', 'A1_B1'] })
  assertEquals(match.spieler[0].entwurf.mauern.length, 2)
})

Deno.test('entwurfSpeichern: ungültige Mauer liefert 400 mit details', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  const fehler = wirft(
    () => entwurfSpeichern(match, NUTZER.id, { schatz: null, mauern: ['A1_F6'] }),
    400,
    'VALIDIERUNG',
  )
  assertEquals(fehler.zusatz.details?.[0].feld, 'mauern[0]')
})

Deno.test('entwurfSpeichern: falsche Form des Body liefert 400', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  wirft(() => entwurfSpeichern(match, NUTZER.id, 'kaputt'), 400, 'VALIDIERUNG')
  wirft(
    () => entwurfSpeichern(match, NUTZER.id, { schatz: 4, mauern: 'A1_A2' }),
    400,
    'VALIDIERUNG',
  )
})

Deno.test('labyrinthSetzen: ohne Schatz 422 SCHATZ_FEHLT', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  wirft(() => labyrinthSetzen(match, NUTZER.id, JETZT), 422, 'SCHATZ_FEHLT')
})

Deno.test('labyrinthSetzen: unlösbar 422 mit problematischen Mauern', () => {
  const match = computerMatchErstellen(NUTZER, 'einfach', JETZT)
  entwurfSpeichern(match, NUTZER.id, { schatz: 'C4', mauern: ['A1_A2', 'A1_B1'] })
  const fehler = wirft(() => labyrinthSetzen(match, NUTZER.id, JETZT), 422, 'LABYRINTH_UNLOESBAR')
  assertEquals(fehler.zusatz.problematischeMauern, ['A1_A2', 'A1_B1'])
  assertEquals(match.status, 'aufbau')
})

Deno.test('labyrinthSetzen: Match wird startbereit, der Computer ist schon bereit', () => {
  const match = vorbereitetesMatch()
  labyrinthSetzen(match, NUTZER.id, JETZT)
  assertEquals(match.status, 'startbereit')
  assertEquals(match.aufbauEndeAm, null)
  assertEquals(match.startFristEndeAm!.getTime(), JETZT.getTime() + START_FRIST_MS)
  assertEquals(match.amZug, null)
  assertEquals(match.spieler.map((s) => s.startBestaetigt), [false, true])
})

// ---------- Bereitschaft ----------

const SPAETER = new Date(JETZT.getTime() + 10_000)

Deno.test('bereit: Spiel startet, der Mensch gewinnt die Auslosung, die Zugfrist läuft', () => {
  const match = vorbereitetesMatch()
  labyrinthSetzen(match, NUTZER.id, JETZT)
  bereitBestaetigen(match, NUTZER.id, SPAETER, ZUERST)
  assertEquals(match.status, 'laeuft')
  assertEquals(match.startFristEndeAm, null)
  assertEquals(match.amZug, NUTZER.id)
  assertEquals(match.zugEndeAm!.getTime(), SPAETER.getTime() + ZUG_FRIST_MS)
  assertEquals(match.spieler[0].letzterAbrufAm, SPAETER)
  assertEquals(match.spieler[1].anfragen, 0)
})

Deno.test('bereit: vor dem Setzen und nach dem Start 409 KONFLIKT', () => {
  const match = vorbereitetesMatch()
  wirft(() => bereitBestaetigen(match, NUTZER.id, JETZT), 409, 'KONFLIKT')
  labyrinthSetzen(match, NUTZER.id, JETZT)
  bereitBestaetigen(match, NUTZER.id, JETZT, ZUERST)
  wirft(() => bereitBestaetigen(match, NUTZER.id, JETZT), 409, 'KONFLIKT')
})

Deno.test('aufgeben: auch im Status startbereit möglich', () => {
  const match = vorbereitetesMatch()
  labyrinthSetzen(match, NUTZER.id, JETZT)
  aufgeben(match, NUTZER.id, JETZT)
  assertEquals(match.status, 'beendet')
  assertEquals(match.siegerId, COMPUTER.id)
  assertEquals(match.startFristEndeAm, null)
})

Deno.test('bereit: gewinnt der Computer die Auslosung, zieht er sofort', () => {
  const match = vorbereitetesMatch()
  labyrinthSetzen(match, NUTZER.id, JETZT)
  bereitBestaetigen(match, NUTZER.id, JETZT, ZULETZT)
  // Der Computer wählt immer die letzte Richtung: erst nach unten bis F1, dann nach rechts zu F6
  assertEquals(match.spieler[1].karte.besuchteZellen.at(-1), 'F6')
  assertEquals(match.spieler[1].anfragen, 2)
  assertEquals(match.status, 'beendet')
  assertEquals(match.siegerId, COMPUTER.id)
  assertEquals(match.zugEndeAm, null)
})

Deno.test('nach dem Setzen: Entwurf und erneutes Setzen liefern 409 AUFBAU_BEENDET', () => {
  const match = vorbereitetesMatch()
  labyrinthSetzen(match, NUTZER.id, JETZT)
  wirft(
    () => entwurfSpeichern(match, NUTZER.id, { schatz: 'B2', mauern: [] }),
    409,
    'AUFBAU_BEENDET',
  )
  wirft(() => labyrinthSetzen(match, NUTZER.id, JETZT), 409, 'AUFBAU_BEENDET')
})

// ---------- 4.3 Anfragen ----------

function laufendesMatch(): MatchIntern {
  const match = vorbereitetesMatch()
  labyrinthSetzen(match, NUTZER.id, JETZT)
  bereitBestaetigen(match, NUTZER.id, JETZT, ZUERST)
  return match
}

Deno.test('anfrage: vor dem Spielstart 409 KONFLIKT', () => {
  const match = vorbereitetesMatch()
  wirft(
    () => anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, JETZT),
    409,
    'KONFLIKT',
  )
})

Deno.test('anfrage: ja über ein Feld, der Spieler bleibt am Zug', () => {
  const match = laufendesMatch()
  const ausgang = anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, JETZT, ZUERST)
  assertEquals(ausgang.ergebnis.ergebnis, 'ja')
  assertEquals(ausgang.computerAnfragen, [])
  assertEquals(match.amZug, NUTZER.id)
  assertEquals(match.anfrageNr, 2)
  assertEquals(match.spieler[0].karte.position, 'A2')
})

Deno.test('anfrage: ja startet die Zugfrist neu', () => {
  const match = laufendesMatch()
  anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, SPAETER, ZUERST)
  assertEquals(match.amZug, NUTZER.id)
  assertEquals(match.zugEndeAm!.getTime(), SPAETER.getTime() + ZUG_FRIST_MS)
})

Deno.test('anfrage: nach dem Zug des Computers beginnt die Frist erst nach der Wiedergabe', () => {
  const match = laufendesMatch()
  // F1 stößt an A1_B1: nein, der Computer spielt sofort, danach bin ich wieder dran
  const { computerAnfragen } = anfrageStellen(
    match,
    NUTZER.id,
    { anfrageNr: 1, ziel: 'F1' },
    SPAETER,
    ZUERST,
  )
  assertEquals(match.amZug, NUTZER.id)
  // meine Anfrage plus die Anfragen des Computers, jede mit Anfrage und Antwort in der Box
  const wiedergabe = (computerAnfragen!.length + 1) * WIEDERGABE_PAUSE_MS
  assertEquals(wiedergabe, 7200) // meine Anfrage und eine des Computers
  assertEquals(match.zugEndeAm!.getTime(), SPAETER.getTime() + wiedergabe + ZUG_FRIST_MS)
})

Deno.test('anfrage: nein, danach spielt der Computer seinen Zug', () => {
  const match = laufendesMatch()
  // Computer-Labyrinth hat A1_B1: Der Mensch kommt nicht nach unten
  const ausgang = anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'F1' }, JETZT, ZUERST)
  assertEquals(ausgang.ergebnis.ergebnis, 'nein')
  // Der Computer fragt nach rechts und trifft sofort die Mauer A1_A2 im Labyrinth des Menschen
  assertEquals(ausgang.computerAnfragen, [
    { ziel: 'A6', ergebnis: 'nein', position: 'A1', mauer: 'A1_A2' },
  ])
  assertEquals(match.amZug, NUTZER.id)
  assertEquals(match.anfrageNr, 3)
})

Deno.test('anfrage: Schatz gefunden beendet das Match', () => {
  const match = laufendesMatch()
  const ausgang = anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A6' }, JETZT, ZUERST)
  assertEquals(ausgang.ergebnis.ergebnis, 'schatzGefunden')
  assertEquals(ausgang.ergebnis.position, 'A3')
  assertEquals(match.status, 'beendet')
  assertEquals(match.siegerId, NUTZER.id)
  assertEquals(match.endegrund, 'schatz')
  assertEquals(match.amZug, null)
})

Deno.test('anfrage: veraltete anfrageNr liefert 409 KONFLIKT', () => {
  const match = laufendesMatch()
  anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, JETZT, ZUERST)
  // Doppelklick: dieselbe Nummer noch einmal
  wirft(
    () => anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, JETZT),
    409,
    'KONFLIKT',
  )
})

Deno.test('anfrage: diagonales Ziel liefert 400 ZIEL_NICHT_GERADE', () => {
  const match = laufendesMatch()
  wirft(
    () => anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'B2' }, JETZT),
    400,
    'ZIEL_NICHT_GERADE',
  )
  assertEquals(match.anfrageNr, 1)
})

Deno.test('anfrage: kaputte Eingabe liefert 400 VALIDIERUNG', () => {
  const match = laufendesMatch()
  wirft(
    () => anfrageStellen(match, NUTZER.id, { anfrageNr: 0, ziel: 'Z9' }, JETZT),
    400,
    'VALIDIERUNG',
  )
})

Deno.test('anfrage: wer nicht am Zug ist, erhält 409 NICHT_AM_ZUG', () => {
  const match = laufendesMatch()
  match.amZug = COMPUTER.id
  wirft(
    () => anfrageStellen(match, NUTZER.id, { anfrageNr: 1, ziel: 'A2' }, JETZT),
    409,
    'NICHT_AM_ZUG',
  )
})

// ---------- Ganze Partie ----------

Deno.test('ganze Partie: endet immer mit einem Sieger, Zähler stimmen', () => {
  for (let i = 0; i < 50; i++) {
    const zufall = festerZufall(i)
    const match = computerMatchErstellen(NUTZER, 'standard', JETZT, zufall)
    // Der Mensch nutzt ein Labyrinth wie der Computer, nur mit vertauschter Rolle
    entwurfSpeichern(
      match,
      NUTZER.id,
      computerMatchErstellen(NUTZER, 'schwer', JETZT, zufall).spieler[1].entwurf,
    )
    labyrinthSetzen(match, NUTZER.id, JETZT)
    bereitBestaetigen(match, NUTZER.id, JETZT, zufall)

    // Der Mensch spielt mit der Strategie des Computers
    let runden = 0
    while (match.status === 'laeuft') {
      assertEquals(match.amZug, NUTZER.id)
      const ziel = zielWaehlen(match.spieler[0].karte, zufall)
      anfrageStellen(match, NUTZER.id, { anfrageNr: match.anfrageNr, ziel }, JETZT, zufall)
      assert(++runden < 500, `Lauf ${i}: kein Ende`)
    }

    assertEquals(match.status, 'beendet')
    assert(match.siegerId === NUTZER.id || match.siegerId === COMPUTER.id)
    const [mensch, computer] = match.spieler
    assertEquals(match.anfrageNr, mensch.anfragen + computer.anfragen + 1)
  }
})

// ---------- Duell anlegen ----------

Deno.test('duellErstellen: Ersteller wartet allein, Code gilt 10 Minuten', () => {
  const match = duellErstellen(NUTZER, 'K7M2P', JETZT)

  assertEquals(match.modus, 'duell')
  assertEquals(match.status, 'wartet')
  assertEquals(match.schwierigkeit, null)
  assertEquals(match.code, 'K7M2P')
  assertEquals(match.codeEndeAm!.getTime() - JETZT.getTime(), CODE_DAUER_MS)
  assertEquals(match.spieler.map((s) => s.id), [NUTZER.id])
  // Der Aufbau beginnt erst mit dem Beitritt
  assertEquals(match.aufbauEndeAm, null)
})
