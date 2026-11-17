import type { Ergebnis, Statistik } from '@shared/types.ts'
import { get } from '@/api'

/** Anzahl der Spiele im Dashboard laut Klartext */
export const LETZTE_SPIELE = 10

/** Eine Seite der eigenen Ergebnisse, neueste zuerst. offset überspringt die ersten Einträge. */
export function ergebnisseLaden(limit = LETZTE_SPIELE, offset = 0): Promise<Ergebnis[]> {
  return get<Ergebnis[]>(`/results?limit=${limit}&offset=${offset}`)
}

/** Siege, Niederlagen und Quote; der Server rechnet */
export function statistikLaden(): Promise<Statistik> {
  return get<Statistik>('/results/stats')
}
