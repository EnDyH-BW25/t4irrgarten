/**
 * FEHLERBEHANDLUNG DES SERVERS: ein Fehlerformat für die ganze API
 * Jede Fehlerantwort sieht gleich aus: { fehler: { code, nachricht, details?, problematischeMauern? } }
 * Ablauf: Eine Route oder ablauf.ts wirft new ApiFehler(...). Hono fängt den Fehler und ruft
 * fehlerBehandeln auf. Daraus wird die JSON-Antwort mit passendem Status.
 * Vorteil: Keine Route baut Fehlerantworten selbst, der Client (api.ts) liest immer dasselbe Format.
 */
import type { Context } from '@hono/hono'
import type { Fehler, FehlerCode } from '../shared/types.ts'

/**
 * HTTP-Status, die unsere API für Fehler nutzt
 * 400 Eingabe ungültig, 401 nicht angemeldet, 403 kein Teilnehmer, 404 nicht gefunden,
 * 409 Zustand passt nicht (z. B. schon ein offenes Match), 422 fachlich unmöglich
 * (z. B. Schatz nicht erreichbar), 500 Programmfehler
 */
export type FehlerStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500

// Pick: nimmt aus dem Fehler-Typ nur diese zwei optionalen Felder heraus
type Zusatz = Pick<Fehler['fehler'], 'details' | 'problematischeMauern'>

/** Fachlicher Fehler, den Handler mit throw auslösen */
export class ApiFehler extends Error {
  constructor(
    public readonly status: FehlerStatus,
    public readonly code: FehlerCode,
    nachricht: string,
    public readonly zusatz: Zusatz = {},
  ) {
    super(nachricht)
    this.name = 'ApiFehler'
  }
}

/** Für app.onError: wandelt jeden Fehler in das JSON-Fehlerformat um */
export function fehlerBehandeln(err: Error, c: Context) {
  // Erwarteter, fachlicher Fehler: Status und Text so weitergeben
  if (err instanceof ApiFehler) {
    const body: Fehler = { fehler: { code: err.code, nachricht: err.message, ...err.zusatz } }
    return c.json(body, err.status)
  }
  // Unerwarteter Fehler (Bug): in die Konsole schreiben, dem Client aber keine Details
  // verraten (kein Stacktrace nach außen, Sicherheit)
  console.error(err)
  const body: Fehler = { fehler: { code: 'INTERN', nachricht: 'Interner Serverfehler.' } }
  return c.json(body, 500)
}

/** Für app.notFound: unbekannte Route */
export function nichtGefunden(c: Context) {
  const body: Fehler = {
    fehler: { code: 'NICHT_GEFUNDEN', nachricht: 'Ressource nicht gefunden.' },
  }
  return c.json(body, 404)
}
