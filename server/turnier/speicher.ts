import type { TurnierIntern } from './typen.ts'

/** Hält alle Turniere im Arbeitsspeicher, wie der MatchSpeicher (ADR-026) */
export class TurnierSpeicher {
  private readonly turniere = new Map<string, TurnierIntern>()

  anlegen(turnier: TurnierIntern): void {
    this.turniere.set(turnier.id, turnier)
  }

  /** Liefert das Turnier oder null */
  holen(id: string): TurnierIntern | null {
    return this.turniere.get(id) ?? null
  }

  /** Liefert das wartende Turnier mit diesem Code oder null. Nach dem Start gilt der Code nicht mehr. */
  nachCode(code: string): TurnierIntern | null {
    for (const turnier of this.turniere.values()) {
      if (turnier.status === 'wartet' && turnier.code === code) return turnier
    }
    return null
  }

  /** Liefert das wartende oder laufende Turnier des Nutzers oder null */
  offenesTurnierVon(nutzerId: string): TurnierIntern | null {
    for (const turnier of this.turniere.values()) {
      const dabei = turnier.teilnehmer.some((t) => t.id === nutzerId)
      const offen = turnier.status === 'wartet' || turnier.status === 'laeuft'
      if (dabei && offen) return turnier
    }
    return null
  }
}
