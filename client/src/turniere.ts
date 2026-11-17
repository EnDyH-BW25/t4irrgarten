import type { Schwierigkeit, Turnier } from '@shared/types.ts'
import { TURNIER_GROESSE } from '@shared/types.ts'
import { ApiFehler, del, get, post } from '@/api'

/** Legt ein Turnier an. Die Schwierigkeit gilt für den Computer-Spieler, falls er auffüllt. */
export function turnierAnlegen(schwierigkeit: Schwierigkeit): Promise<Turnier> {
  return post<Turnier>('/competitions', { groesse: TURNIER_GROESSE, schwierigkeit })
}

/** Tritt einem Turnier mit dem Code bei. Ein Duell-Code liefert 404. */
export function turnierBeitreten(code: string): Promise<Turnier> {
  return post<Turnier>('/competitions/join', { code })
}

/** Liefert das wartende oder laufende Turnier oder null, wenn es keines gibt */
export async function offenesTurnier(): Promise<Turnier | null> {
  try {
    return await get<Turnier>('/competitions/current')
  } catch (e) {
    // 404 heißt hier: kein offenes Turnier, wie bei offenesMatch()
    if (e instanceof ApiFehler && e.status === 404) return null
    throw e
  }
}

/** Aktueller Stand; der Abruf schreibt das Turnier auf dem Server fort (Runde 2, Platzierung) */
export function turnierAbrufen(id: string): Promise<Turnier> {
  return get<Turnier>(`/competitions/${id}`)
}

/** Nur der Host, ab drei Spielern */
export function turnierStarten(id: string): Promise<Turnier> {
  return post<Turnier>(`/competitions/${id}/start`)
}

/** Verlässt den Warteraum. Beim Host endet das Turnier. */
export function turnierVerlassen(id: string): Promise<void> {
  return del<void>(`/competitions/${id}/participants/me`)
}
