import type { Match, Schwierigkeit } from '@shared/types.ts'
import { ApiFehler, get, post } from '@/api'

/** Legt ein Match gegen den Computer an. */
export function matchAnlegen(schwierigkeit: Schwierigkeit): Promise<Match> {
  return post<Match>('/matches', { modus: 'computer', schwierigkeit })
}

/** Legt ein Duell an. Die Antwort enthält den Spielcode für den Warteraum. */
export function duellAnlegen(): Promise<Match> {
  return post<Match>('/matches', { modus: 'duell' })
}

/** Tritt einem Duell mit dem Code bei. Der Server ignoriert Groß- und Kleinschreibung. */
export function beitreten(code: string): Promise<Match> {
  return post<Match>('/matches/join', { code })
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
