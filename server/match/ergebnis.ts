import type { GespeichertesErgebnis } from '../ergebnis/speicher.ts'
import type { MatchIntern } from './typen.ts'

/**
 * BRÜCKE MATCH => ERGEBNIS: Aus einem beendeten Match werden dauerhafte Ergebnis-Einträge.
 * Aufruf über ergebnisseSichern (turnier/nachtragen.ts) nach jeder Änderung am Match.
 *
 * Baut die Ergebnisse eines Matches: ein Eintrag pro Mensch, der Computer bekommt keinen.
 * Nur ein beendetes Match hat Ergebnisse. Ein abgebrochenes hat keine Wertung.
 */
export function ergebnisseAus(match: MatchIntern): GespeichertesErgebnis[] {
  if (match.status !== 'beendet') return []

  return match.spieler
    .filter((s) => !s.istComputer)
    .map((s) => ({
      id: crypto.randomUUID(),
      nutzerId: s.id,
      matchId: match.id,
      competitionId: match.competitionId,
      runde: match.runde,
      platzierung: null, // im Turnier erst nach Runde 2 bekannt, wird dann nachgetragen
      modus: match.modus,
      schwierigkeit: match.schwierigkeit,
      gegner: match.spieler.find((g) => g.id !== s.id)?.name ?? '',
      ausgang: s.id === match.siegerId ? 'sieg' : 'niederlage',
      endegrund: match.endegrund!,
      anfragen: s.anfragen,
      beendetAm: match.beendetAm!.toISOString(),
    }))
}
