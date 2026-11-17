import type { Endegrund } from '../../shared/types.ts'
import { beenden } from '../match/ablauf.ts'
import type { MatchSpeicher } from '../match/speicher.ts'
import type { MatchIntern } from '../match/typen.ts'
import type { Zufall } from '../spiellogik/generator.ts'
import { paarungAnlegen, turnierAbbrechen } from './ablauf.ts'
import type { TeilnehmerIntern, TurnierIntern } from './typen.ts'

/** Wer so verliert, ist nicht mehr da und verliert alle folgenden Matches (ADR-011) */
const AUSSCHEIDEN: Endegrund[] = ['aufgabe', 'abwesenheit', 'zugfrist', 'startfrist', 'walkover']

/**
 * Bringt das Turnier auf den Stand seiner Matches. Es gibt keinen Timer: Die Route ruft das bei
 * jedem Abruf auf, nachdem sie die Fristen der Matches nachgetragen hat (wie ADR-028).
 *
 * - Ein Match der aktuellen Runde ist abgebrochen: Das Turnier endet ohne Wertung.
 * - Runde 1 ist komplett beendet: Runde 2 entsteht.
 * - Runde 2 ist komplett beendet: Die Platzierung steht fest.
 *
 * Gibt die neu angelegten Matches zurück. Die Route speichert sie im MatchSpeicher.
 */
export function turnierFortschreiben(
  turnier: TurnierIntern,
  matches: MatchSpeicher,
  jetzt: Date,
  zufall: Zufall = Math.random,
): MatchIntern[] {
  if (turnier.status !== 'laeuft') return []

  const runde = turnier.runden[turnier.runden.length - 1]
  const rundenMatches = runde.map((p) => matches.holen(p.matchId)!)

  if (rundenMatches.some((m) => m.status === 'abgebrochen')) {
    turnierAbbrechen(turnier)
    return []
  }
  if (!rundenMatches.every((m) => m.status === 'beendet')) return []

  if (turnier.runden.length === 1) return runde2Anlegen(turnier, rundenMatches, jetzt, zufall)

  platzierungFestlegen(turnier, matches)
  return []
}

/**
 * Gewinner spielen um Platz 1 und 2, Verlierer um Platz 3 und 4. Wer in Runde 1 aufgab oder per
 * Frist verlor, tritt nicht mehr an: Sein Gegner gewinnt kampflos.
 */
function runde2Anlegen(
  turnier: TurnierIntern,
  runde1: MatchIntern[],
  jetzt: Date,
  zufall: Zufall,
): MatchIntern[] {
  const person = (id: string) => turnier.teilnehmer.find((t) => t.id === id)!
  const sieger = runde1.map((m) => person(m.siegerId!))
  const verlierer = runde1.map((m) => person(verliererId(m)))
  const ausgeschieden = runde1
    .filter((m) => AUSSCHEIDEN.includes(m.endegrund!))
    .map(verliererId)

  const paare: [TeilnehmerIntern, TeilnehmerIntern, number[]][] = [
    [sieger[0], sieger[1], [1, 2]],
    [verlierer[0], verlierer[1], [3, 4]],
  ]

  // Keiner von beiden erscheint: Das Turnier endet ohne Wertung (Entscheidung Phase 7)
  if (paare.some(([a, b]) => ausgeschieden.includes(a.id) && ausgeschieden.includes(b.id))) {
    turnierAbbrechen(turnier)
    return []
  }

  const neue = paare.map(([a, b]) => {
    const match = paarungAnlegen(turnier, 2, a, b, jetzt, zufall)
    const fehlt = [a, b].find((s) => ausgeschieden.includes(s.id))
    if (fehlt) {
      // Kampflos: Das Match endet sofort, der Anwesende gewinnt
      const anwesend = fehlt === a ? b : a
      beenden(match, anwesend.id, 'walkover', jetzt)
      match.version++
    }
    return match
  })

  turnier.runden.push(neue.map((m, i) => ({ matchId: m.id, platzUm: paare[i][2] })))
  return neue
}

/** Sieger einer Paarung bekommt den besseren der beiden Plätze, der Verlierer den anderen */
function platzierungFestlegen(turnier: TurnierIntern, matches: MatchSpeicher): void {
  const runde2 = turnier.runden[1]
  turnier.platzierungen = runde2.flatMap((p) => {
    const match = matches.holen(p.matchId)!
    const [besser, schlechter] = p.platzUm
    return [
      { platz: besser, spielerId: match.siegerId! },
      { platz: schlechter, spielerId: verliererId(match) },
    ]
  }).sort((x, y) => x.platz - y.platz)
  turnier.status = 'beendet'
}

function verliererId(match: MatchIntern): string {
  return match.spieler.find((s) => s.id !== match.siegerId)!.id
}
