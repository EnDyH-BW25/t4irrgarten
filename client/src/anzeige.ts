import type { AnfrageErgebnis, Endegrund, MatchStatus, Schwierigkeit } from '@shared/types.ts'

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

/** Antwort auf eine Anfrage in Worten */
export function antwortText(a: AnfrageErgebnis): string {
  switch (a.ergebnis) {
    case 'ja':
      return `Ja, weiter auf ${a.position}`
    case 'nurBis':
      return `Nur bis ${a.position}, dann eine Mauer`
    case 'nein':
      return 'Nein, eine Mauer direkt davor'
    case 'schatzGefunden':
      return `Schatz gefunden auf ${a.position}!`
  }
}

/** Grund für das Spielende */
export const ENDEGRUND_TEXT: Record<Endegrund, string> = {
  schatz: 'Schatz gefunden',
  aufgabe: 'Aufgegeben',
  abwesenheit: 'Verbindung abgebrochen',
  zugfrist: 'Zugzeit überschritten',
  startfrist: 'Nicht rechtzeitig bereit',
  walkover: 'Kampflos',
}
