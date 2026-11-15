import type { MatchStatus, Schwierigkeit } from '@shared/types.ts'

/** Anzeigenamen laut ADR-015; die Reihenfolge ist die des Dropdowns */
export const SCHWIERIGKEITEN: { wert: Schwierigkeit; text: string }[] = [
  { wert: 'einfach', text: 'Einfach' },
  { wert: 'standard', text: 'Standard' },
  { wert: 'schwer', text: 'Schwer' },
]

/** Status eines Matches in Worten für die Oberfläche */
export const STATUS_TEXT: Record<MatchStatus, string> = {
  wartet: 'Wartet auf den Gegner',
  aufbau: 'Aufbau',
  startbereit: 'Startbereit',
  laeuft: 'Spiel läuft',
  beendet: 'Beendet',
  abgebrochen: 'Abgebrochen',
}
