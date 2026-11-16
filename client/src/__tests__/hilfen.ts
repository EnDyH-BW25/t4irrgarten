import type { Match } from '@shared/types.ts'
import { vi } from 'vitest'

/**
 * Ersetzt fetch durch eine Attrappe, die je nach URL antwortet.
 * Eine URL ohne Eintrag lässt den Test mit einer klaren Meldung scheitern.
 */
export function serverAttrappe(antworten: Record<string, () => Response>) {
  const attrappe = vi.fn<typeof fetch>(async (url) => {
    const antwort = antworten[String(url)]
    if (!antwort) throw new Error(`Keine Antwort für ${url} vorgesehen`)
    return antwort()
  })
  vi.stubGlobal('fetch', attrappe)
  return attrappe
}

export const nichtAngemeldet = () =>
  Response.json(
    { fehler: { code: 'NICHT_ANGEMELDET', nachricht: 'Bitte melde dich an.' } },
    { status: 401 },
  )

export const nichtErreichbar = (): Response => {
  throw new TypeError('Failed to fetch')
}

/** Vollständiges Match im Aufbau, wie es der Server schickt. Tests überschreiben einzelne Felder. */
export function beispielMatch(aenderungen: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    version: 1,
    serverZeit: '2026-11-16T10:00:00.000Z',
    modus: 'computer',
    schwierigkeit: 'standard',
    status: 'aufbau',
    code: null,
    competitionId: null,
    spieler: [
      { id: 'id-1', name: 'nudl', istComputer: false, anfragen: 0 },
      { id: 'computer', name: 'Computer', istComputer: true, anfragen: 0 },
    ],
    amZug: null,
    anfrageNr: 1,
    aufbauEndeAm: '2026-11-16T10:03:00.000Z',
    startFristEndeAm: null,
    zugEndeAm: null,
    ich: { labyrinthGesetzt: false, startBestaetigt: false, nachbesserungEndeAm: null },
    gegner: { labyrinthGesetzt: true, startBestaetigt: false, nachbesserungEndeAm: null },
    pruefung: { loesbar: null, meldung: null, problematischeMauern: [] },
    meinLabyrinth: { schatz: null, mauern: [] },
    bekannteKarte: { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] },
    gegnerKarte: { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] },
    siegerId: null,
    endegrund: null,
    gegnerLabyrinth: null,
    ...aenderungen,
  }
}
