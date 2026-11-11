import type { Context } from '@hono/hono'
import type { Fehler, FehlerCode } from '../shared/types.ts'

/** HTTP-Status, die unsere API für Fehler nutzt */
export type FehlerStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500

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
  if (err instanceof ApiFehler) {
    const body: Fehler = { fehler: { code: err.code, nachricht: err.message, ...err.zusatz } }
    return c.json(body, err.status)
  }
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
