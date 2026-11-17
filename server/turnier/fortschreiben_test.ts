import { assertEquals } from '@std/assert'
import { abbrechen, aufgeben, beenden } from '../match/ablauf.ts'
import { MatchSpeicher } from '../match/speicher.ts'
import type { MatchIntern } from '../match/typen.ts'
import { festerZufall } from '../testHilfen.ts'
import { turnierBeitreten, turnierErstellen, turnierStarten } from './ablauf.ts'
import { turnierFortschreiben } from './fortschreiben.ts'
import type { TurnierIntern } from './typen.ts'

const JETZT = new Date('2026-11-17T10:00:00Z')

/** Vier Menschen, Runde 1 läuft. Die Matches liegen im Speicher wie im echten Server. */
function gestartet(...namen: string[]) {
  const [host, ...weitere] = namen.map((n) => ({ id: n.toLowerCase(), name: n }))
  const turnier = turnierErstellen(host, 'standard', 'H3R8W', JETZT)
  for (const n of weitere) turnierBeitreten(turnier, n)
  const matches = new MatchSpeicher()
  for (const m of turnierStarten(turnier, host.id, JETZT, festerZufall(1))) matches.anlegen(m)
  return { turnier, matches }
}

function runde(turnier: TurnierIntern, matches: MatchSpeicher, nr: number): MatchIntern[] {
  return turnier.runden[nr - 1].map((p) => matches.holen(p.matchId)!)
}

/** Fortschreiben wie die Route: neue Matches landen im Speicher */
function fortschreiben(turnier: TurnierIntern, matches: MatchSpeicher): MatchIntern[] {
  const neue = turnierFortschreiben(turnier, matches, JETZT, festerZufall(2))
  for (const m of neue) matches.anlegen(m)
  return neue
}

/** Der erste Spieler des Matches findet den Schatz */
function ersterGewinnt(match: MatchIntern): void {
  beenden(match, match.spieler[0].id, 'schatz', JETZT)
}

Deno.test('fortschreiben: solange Runde 1 läuft, passiert nichts', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara', 'David')
  ersterGewinnt(runde(turnier, matches, 1)[0])
  assertEquals(fortschreiben(turnier, matches), [])
  assertEquals(turnier.runden.length, 1)
})

Deno.test('fortschreiben: nach Runde 1 spielen Sieger um Platz 1 und Verlierer um Platz 3', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara', 'David')
  const [m1, m2] = runde(turnier, matches, 1)
  ersterGewinnt(m1)
  ersterGewinnt(m2)

  const [finale, um3] = fortschreiben(turnier, matches)
  const ids = (m: MatchIntern) => m.spieler.map((s) => s.id).sort()
  assertEquals(ids(finale), [m1.spieler[0].id, m2.spieler[0].id].sort())
  assertEquals(ids(um3), [m1.spieler[1].id, m2.spieler[1].id].sort())
  assertEquals(turnier.runden[1].map((p) => p.platzUm), [[1, 2], [3, 4]])
  for (const m of [finale, um3]) assertEquals([m.status, m.runde], ['aufbau', 2])

  // Ein zweiter Abruf legt Runde 2 nicht noch einmal an
  assertEquals(fortschreiben(turnier, matches), [])
})

Deno.test('fortschreiben: wer in Runde 1 aufgibt, verliert Runde 2 kampflos', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara', 'David')
  const [m1, m2] = runde(turnier, matches, 1)
  const aufgeber = m1.spieler[1].id
  aufgeben(m1, aufgeber, JETZT) // spieler[0] gewinnt
  ersterGewinnt(m2)

  const um3 = fortschreiben(turnier, matches)[1]
  assertEquals([um3.status, um3.endegrund], ['beendet', 'walkover'])
  assertEquals(um3.siegerId, m2.spieler[1].id)
})

Deno.test('fortschreiben: haben beide Verlierer aufgegeben, endet das Turnier ohne Wertung', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara', 'David')
  for (const m of runde(turnier, matches, 1)) aufgeben(m, m.spieler[1].id, JETZT)

  assertEquals(fortschreiben(turnier, matches), [])
  assertEquals(turnier.status, 'abgebrochen')
})

Deno.test('fortschreiben: ein abgebrochenes Match bricht das Turnier ab', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara', 'David')
  abbrechen(runde(turnier, matches, 1)[0]) // keiner bestätigte die Bereitschaft
  fortschreiben(turnier, matches)
  assertEquals(turnier.status, 'abgebrochen')
})

Deno.test('fortschreiben: nach Runde 2 steht die Platzierung fest', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara', 'David')
  for (const m of runde(turnier, matches, 1)) ersterGewinnt(m)
  const [finale, um3] = fortschreiben(turnier, matches)
  ersterGewinnt(finale)
  ersterGewinnt(um3)

  fortschreiben(turnier, matches)
  assertEquals(turnier.status, 'beendet')
  assertEquals(turnier.platzierungen, [
    { platz: 1, spielerId: finale.spieler[0].id },
    { platz: 2, spielerId: finale.spieler[1].id },
    { platz: 3, spielerId: um3.spieler[0].id },
    { platz: 4, spielerId: um3.spieler[1].id },
  ])
})

Deno.test('fortschreiben: mit Computer läuft Runde 2 ebenso, der Computer kann kampflos gewinnen', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara')
  const [m1, m2] = runde(turnier, matches, 1)
  // Der Mensch im Computer-Match gibt auf: Er verliert auch Runde 2
  const computerMatch = m1.modus === 'computer' ? m1 : m2
  const anderes = computerMatch === m1 ? m2 : m1
  const mensch = computerMatch.spieler.find((s) => !s.istComputer)!
  aufgeben(computerMatch, mensch.id, JETZT)
  aufgeben(anderes, anderes.spieler[0].id, JETZT)

  // Finale: Computer gegen Sieger des anderen Matches; um Platz 3: zwei Aufgeber
  // Beide Verlierer haben aufgegeben: Turnier ohne Wertung
  assertEquals(fortschreiben(turnier, matches), [])
  assertEquals(turnier.status, 'abgebrochen')
})

Deno.test('fortschreiben: Computer im Finale gegen einen Menschen', () => {
  const { turnier, matches } = gestartet('Anna', 'Ben', 'Clara')
  const [m1, m2] = runde(turnier, matches, 1)
  for (const m of [m1, m2]) {
    // Der Computer gewinnt sein Match per Schatz, im anderen gewinnt der erste Spieler
    const computer = m.spieler.find((s) => s.istComputer)
    beenden(m, computer?.id ?? m.spieler[0].id, 'schatz', JETZT)
  }

  const [finale, um3] = fortschreiben(turnier, matches)
  assertEquals(finale.modus, 'computer')
  assertEquals(finale.competitionId, turnier.id)
  assertEquals(um3.modus, 'duell')
})
