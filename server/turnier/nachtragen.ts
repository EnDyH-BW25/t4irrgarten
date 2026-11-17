import type { ErgebnisSpeicher } from '../ergebnis/speicher.ts'
import { ergebnisseAus } from '../match/ergebnis.ts'
import { fristenPruefen } from '../match/fristpruefung.ts'
import type { MatchSpeicher } from '../match/speicher.ts'
import type { MatchIntern } from '../match/typen.ts'
import type { Zufall } from '../spiellogik/generator.ts'
import { codefristPruefen } from './ablauf.ts'
import { turnierFortschreiben } from './fortschreiben.ts'
import type { TurnierSpeicher } from './speicher.ts'
import type { TurnierIntern } from './typen.ts'

/** Alles, was das Nachtragen braucht; Match- und Turnier-Routen teilen es sich */
export type Spielstand = {
  matches: MatchSpeicher
  turniere: TurnierSpeicher
  ergebnisse: ErgebnisSpeicher
  uhr: () => Date
  zufall: Zufall
}

/** Trägt die Ergebnisse eines beendeten Matches ein. Ein zweiter Aufruf ändert nichts. */
export async function ergebnisseSichern(s: Spielstand, match: MatchIntern): Promise<void> {
  if (match.status === 'beendet') await s.ergebnisse.eintragen(ergebnisseAus(match))
}

/**
 * Bringt ein Turnier auf den aktuellen Stand, ohne Timer (wie ADR-028):
 * Code-Frist, Fristen der Matches der aktuellen Runde, dann Runde 2 oder Platzierung.
 */
export async function turnierNachtragen(s: Spielstand, turnier: TurnierIntern): Promise<void> {
  const jetzt = s.uhr()
  codefristPruefen(turnier, jetzt)

  const runde = turnier.runden[turnier.runden.length - 1] ?? []
  for (const p of runde) {
    const match = s.matches.holen(p.matchId)!
    // Kein Lebenszeichen: Wer die Übersicht ansieht, spielt gerade nicht in diesem Match
    fristenPruefen(match, jetzt, s.zufall)
    await ergebnisseSichern(s, match)
  }

  for (const match of turnierFortschreiben(turnier, s.matches, jetzt, s.zufall)) {
    s.matches.anlegen(match)
    await ergebnisseSichern(s, match) // ein kampfloses Match ist sofort beendet
  }
  if (turnier.status === 'beendet') {
    await s.ergebnisse.platzierungEintragen(turnier.id, turnier.platzierungen)
  }
}

/** Offenes Match des Nutzers nach dem Nachtragen der Fristen. Ein abgelaufenes zählt nicht. */
export async function offenesMatch(s: Spielstand, nutzerId: string): Promise<MatchIntern | null> {
  const match = s.matches.offenesMatchVon(nutzerId)
  if (!match) return null
  fristenPruefen(match, s.uhr(), s.zufall)
  await ergebnisseSichern(s, match)
  return s.matches.offenesMatchVon(nutzerId)
}

/** Wartendes oder laufendes Turnier des Nutzers nach dem Nachtragen */
export async function offenesTurnier(
  s: Spielstand,
  nutzerId: string,
): Promise<TurnierIntern | null> {
  const turnier = s.turniere.offenesTurnierVon(nutzerId)
  if (!turnier) return null
  await turnierNachtragen(s, turnier)
  return s.turniere.offenesTurnierVon(nutzerId)
}
