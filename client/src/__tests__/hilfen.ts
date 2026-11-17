/**
 * TEST-HILFEN: gemeinsame Bausteine für alle Client-Tests (keine Tests selbst)
 * Problem: Client-Tests sollen ohne laufenden Deno-Server funktionieren.
 * Lösung: fetch durch eine Attrappe (Mock) ersetzen, die feste Antworten liefert.
 * Dazu fertige Beispieldaten (Match, Turnier), damit nicht jeder Test 30 Felder tippt.
 */
import type { Match, Turnier } from '@shared/types.ts'
import { vi } from 'vitest' // vi = Vitest-Werkzeugkasten für Mocks und Spione

/**
 * Ersetzt fetch durch eine Attrappe, die je nach URL antwortet.
 * Eine URL ohne Eintrag lässt den Test mit einer klaren Meldung scheitern.
 * Beispiel: serverAttrappe({ '/api/auth/me': nichtAngemeldet })
 * Rückgabe: die Attrappe selbst. Tests prüfen damit, ob und wie oft fetch aufgerufen wurde.
 */
export function serverAttrappe(antworten: Record<string, () => Response>) {
  // vi.fn: Funktion, die sich jeden Aufruf merkt (Spion) und hier eine eigene Logik hat
  const attrappe = vi.fn<typeof fetch>(async (url) => {
    const antwort = antworten[String(url)]
    if (!antwort) throw new Error(`Keine Antwort für ${url} vorgesehen`)
    // Funktion statt fertiger Response: Eine Response lässt sich nur einmal lesen,
    // so entsteht bei jedem Aufruf eine frische
    return antwort()
  })
  // stubGlobal: ersetzt das globale fetch für diesen Test; api.ts merkt davon nichts
  vi.stubGlobal('fetch', attrappe)
  return attrappe
}

/** Antwort des Servers ohne Session: 401 im echten Fehlerformat */
export const nichtAngemeldet = () =>
  Response.json(
    { fehler: { code: 'NICHT_ANGEMELDET', nachricht: 'Bitte melde dich an.' } },
    { status: 401 },
  )

/** Server aus: Das echte fetch wirft dann genau diesen TypeError, api.ts macht NETZWERK daraus */
export const nichtErreichbar = (): Response => {
  throw new TypeError('Failed to fetch')
}

/**
 * Vollständiges Match im Aufbau, wie es der Server schickt. Tests überschreiben einzelne Felder.
 * Muster "Test Data Builder": beispielMatch({ status: 'laeuft', amZug: 'id-1' })
 * Partial<Match> = alle Felder optional. ...aenderungen am Ende überschreibt die Standardwerte.
 */
export function beispielMatch(aenderungen: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    version: 1,
    serverZeit: '2026-11-16T10:00:00.000Z',
    modus: 'computer',
    schwierigkeit: 'standard',
    status: 'aufbau',
    code: null,
    codeEndeAm: null,
    competitionId: null,
    spieler: [
      { id: 'id-1', name: 'nudl', istComputer: false, anfragen: 0 },
      { id: 'computer', name: 'Computer', istComputer: true, anfragen: 0 },
    ],
    amZug: null,
    anfrageNr: 1,
    aufbauEndeAm: '2026-11-16T10:03:00.000Z', // 3 Minuten nach serverZeit
    startFristEndeAm: null,
    zugEndeAm: null,
    ich: { labyrinthGesetzt: false, startBestaetigt: false, nachbesserungEndeAm: null },
    gegner: { labyrinthGesetzt: true, startBestaetigt: false, nachbesserungEndeAm: null },
    pruefung: { loesbar: null, meldung: null, problematischeMauern: [] },
    meinLabyrinth: { schatz: null, mauern: [] },
    bekannteKarte: { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] },
    gegnerKarte: { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] },
    gegnerAnfragen: [],
    siegerId: null,
    endegrund: null,
    gegnerLabyrinth: null, // erst nach Spielende gefüllt
    ...aenderungen,
  }
}

/** Turnier im Warteraum aus Sicht des Hosts nudl (id-1). Tests überschreiben einzelne Felder. */
export function beispielTurnier(aenderungen: Partial<Turnier> = {}): Turnier {
  return {
    id: 'turnier-1',
    serverZeit: '2026-11-17T10:00:00.000Z',
    groesse: 4,
    schwierigkeit: 'standard',
    status: 'wartet',
    hostId: 'id-1',
    code: 'H3R8W',
    codeEndeAm: '2026-11-17T10:30:00.000Z', // Code gilt 30 Minuten
    teilnehmer: [{ id: 'id-1', name: 'nudl', istComputer: false, anfragen: 0 }],
    runden: [],
    platzierungen: [],
    meinNaechstesMatchId: null,
    ...aenderungen,
  }
}
