/**
 * ANZEIGE-TEXTE: übersetzt Werte aus dem Vertrag in deutsche Texte für die Oberfläche
 * Trennung: Der Server liefert maschinenlesbare Werte ('laeuft', 'nurBis'),
 * diese Datei macht daraus Text ('Spiel läuft'). So bleibt der Vertrag sprachneutral.
 * Record<Schlüsseltyp, Werttyp>: TypeScript meldet einen Fehler, wenn ein Schlüssel fehlt.
 * Kommt also ein neuer Status dazu, erinnert der Compiler an den fehlenden Text.
 */
import type {
  AnfrageErgebnis,
  Endegrund,
  Ergebnis,
  MatchStatus,
  Schwierigkeit,
  Turnier,
} from '@shared/types.ts'

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

/**
 * Antwort auf eine Anfrage in Worten
 * Die vier Antworten der Spielregel: ja (bis zum Ziel gekommen), nurBis (Mauer unterwegs),
 * nein (Mauer direkt vor der Figur), schatzGefunden (Spiel gewonnen).
 */
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

/** Farbe des Antwort-Etiketts in der Anfragebox; volle Klassennamen, damit Tailwind sie findet */
// Tailwind sucht Klassennamen als Text im Code. Zusammengesetzte Namen ('bg-' + farbe) fände es nicht.
export const ANTWORT_FARBE: Record<AnfrageErgebnis['ergebnis'], string> = {
  ja: 'bg-green-100 text-green-800',
  nurBis: 'bg-amber-100 text-amber-900',
  nein: 'bg-red-100 text-red-800',
  schatzGefunden: 'bg-cyan-100 text-cyan-900',
}

/** Grund für das Spielende */
export const ENDEGRUND_TEXT: Record<Endegrund, string> = {
  schatz: 'Schatz gefunden',
  aufgabe: 'Aufgegeben',
  abwesenheit: 'Verbindung abgebrochen',
  zugfrist: 'Zugzeit überschritten',
  startfrist: 'Nicht rechtzeitig bereit',
  walkover: 'Kampflos', // Turnier: Gegner aus Runde 1 fehlt, der andere kommt kampflos weiter
}

/** Quote als ganze Prozentzahl, z. B. 0.666 => "67 %" */
export function quoteText(quote: number): string {
  return `${Math.round(quote * 100)} %`
}

/** Zeitpunkt in deutscher Kurzform in der Zeitzone des Browsers, z. B. "16.11.26, 11:00" */
// Der Server speichert UTC (ISO-String). Erst hier wird daraus deutsche Ortszeit.
export function datumText(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}

/** Gegner in Worten; beim Computer mit Schwierigkeit, z. B. "Computer (Schwer)" */
export function gegnerText(e: Ergebnis): string {
  if (e.modus !== 'computer') return e.gegner
  const stufe = SCHWIERIGKEITEN.find((s) => s.wert === e.schwierigkeit)
  return stufe ? `Computer (${stufe.text})` : 'Computer'
}

/** Kurzer Stand eines Turniers, z. B. "Warteraum · 3 von 4 Spielern" oder "Runde 2 läuft" */
export function turnierStandText(t: Turnier): string {
  if (t.status === 'wartet') return `Warteraum · ${t.teilnehmer.length} von ${t.groesse} Spielern`
  if (t.status === 'laeuft') return `Runde ${t.runden.length} läuft` // Anzahl Runden = aktuelle Runde
  return t.status === 'beendet' ? 'Beendet' : 'Abgebrochen'
}
