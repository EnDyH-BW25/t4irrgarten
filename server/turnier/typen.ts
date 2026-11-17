/**
 * INTERNE TURNIER-TYPEN (ADR-034: Turnier als Hülle um normale Matches)
 * Ein Turnier mit 4 Spielern: Runde 1 = 2 Matches, Runde 2 = Finale (Platz 1/2) und
 * Spiel um Platz 3 (Platz 3/4). Jeder spielt also genau zwei Matches.
 * Das Turnier speichert nur Verweise (matchId). Status, Sieger und Spielstand stehen im Match.
 * So gibt es keine doppelten Daten, die auseinanderlaufen könnten.
 */
import type { Schwierigkeit, TurnierStatus } from '../../shared/types.ts'

/** Teilnehmer eines Turniers; der Computer-Spieler kommt erst beim Start dazu */
export type TeilnehmerIntern = {
  id: string
  name: string
  istComputer: boolean
}

/** Eine Paarung merkt sich nur ihr Match. Status und Sieger stehen im Match selbst. */
export type PaarungIntern = {
  matchId: string
  platzUm: number[] // Runde 1 leer, Runde 2 [1, 2] oder [3, 4]
}

/** Ein Turnier aus Sicht des Servers */
export type TurnierIntern = {
  id: string
  groesse: number
  schwierigkeit: Schwierigkeit // Labyrinthe des Computer-Spielers
  status: TurnierStatus
  hostId: string
  code: string | null // nur im Status wartet gesetzt
  codeEndeAm: Date | null // nur im Status wartet gesetzt
  teilnehmer: TeilnehmerIntern[]
  runden: PaarungIntern[][] // Index 0 ist Runde 1
  platzierungen: { platz: number; spielerId: string }[] // erst nach Runde 2 gefüllt
}
