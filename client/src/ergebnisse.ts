/**
 * ERGEBNIS-AUFRUFE für Dashboard und ErgebnisseView (Phase 6, ADR-033)
 * Ergebnisse liegen auf dem Server dauerhaft in einer JSON-Datei (ADR-029).
 */
import type { Ergebnis, Statistik } from '@shared/types.ts'
import { get } from '@/api'

/** Anzahl der Spiele im Dashboard laut Klartext */
export const LETZTE_SPIELE = 10

/**
 * Eine Seite der eigenen Ergebnisse, neueste zuerst. offset überspringt die ersten Einträge.
 * Beispiel: limit 20, offset 20 => Einträge 21 bis 40 ("Mehr laden" in ErgebnisseView).
 */
export function ergebnisseLaden(limit = LETZTE_SPIELE, offset = 0): Promise<Ergebnis[]> {
  return get<Ergebnis[]>(`/results?limit=${limit}&offset=${offset}`)
}

/** Siege, Niederlagen und Quote; der Server rechnet */
export function statistikLaden(): Promise<Statistik> {
  return get<Statistik>('/results/stats')
}
