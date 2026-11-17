/**
 * MATCHSPEICHER: alle Matches als Map im Arbeitsspeicher (ADR-026)
 * Bewusst ohne Datei: Ein laufendes Spiel dauert Minuten, ein Neustart ist selten.
 * Dauerhaft bleibt nur das Ergebnis (ErgebnisSpeicher). Bekannte Schwäche, im Rückblick genannt.
 * Der Speicher gibt das Objekt selbst heraus. ablauf.ts ändert es direkt (keine Kopie).
 */
import type { MatchIntern } from './typen.ts'

/** Hält alle Matches im Arbeitsspeicher unter ihrer Id. Ein Neustart löscht sie (ADR-026). */
export class MatchSpeicher {
  private readonly matches = new Map<string, MatchIntern>()

  /** Speichert ein Match unter seiner Id. Die Id vergibt schon computerMatchErstellen. */
  anlegen(match: MatchIntern): void {
    this.matches.set(match.id, match)
  }

  /** Liefert das Match oder null */
  holen(id: string): MatchIntern | null {
    return this.matches.get(id) ?? null
  }

  /** Liefert das wartende Duell mit diesem Code oder null. Nach dem Beitritt gilt der Code nicht mehr. */
  nachCode(code: string): MatchIntern | null {
    for (const match of this.matches.values()) {
      if (match.status === 'wartet' && match.code === code) return match
    }
    return null
  }

  /**
   * Liefert das Match, in dem der Nutzer gerade spielt; beendete und abgebrochene zählen nicht
   * Durchsucht alle Matches (lineare Suche). Bei wenigen gleichzeitigen Spielen kein Problem.
   */
  offenesMatchVon(nutzerId: string): MatchIntern | null {
    for (const match of this.matches.values()) {
      const spieltMit = match.spieler.some((s) => s.id === nutzerId)
      const offen = match.status !== 'beendet' && match.status !== 'abgebrochen'
      if (spieltMit && offen) return match
    }
    return null
  }
}
