import type { GespeichertesErgebnis } from '../ergebnis/speicher.ts'
import type { MatchIntern } from './typen.ts'

/**
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
      competitionId: null,
      runde: null,
      platzierung: null,
      modus: match.modus,
      schwierigkeit: match.schwierigkeit,
      gegner: match.spieler.find((g) => g.id !== s.id)?.name ?? '',
      ausgang: s.id === match.siegerId ? 'sieg' : 'niederlage',
      endegrund: match.endegrund!,
      anfragen: s.anfragen,
      beendetAm: match.beendetAm!.toISOString(),
    }))
}
