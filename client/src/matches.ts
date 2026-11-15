import type { Match, Schwierigkeit } from '@shared/types.ts'
import { ApiFehler, get, post } from '@/api'

/** Legt ein Match gegen den Computer an. */
export function matchAnlegen(schwierigkeit: Schwierigkeit): Promise<Match> {
  return post<Match>('/matches', { modus: 'computer', schwierigkeit })
}

/** Liefert das offene Match oder null, wenn es keines gibt */
export async function offenesMatch(): Promise<Match | null> {
  try {
    return await get<Match>('/matches/current')
  } catch (e) {
    // 404 heißt hier: kein offenes Match => kein Fehler, sondern Normalfall
    if (e instanceof ApiFehler && e.status === 404) return null
    throw e // alles andere (Netzwerk, 401, ...) gibt die Funktion weiter
  }
}

/** Gibt das Match auf */
export function aufgeben(id: string): Promise<Match> {
  return post<Match>(`/matches/${id}/resign`)
}
