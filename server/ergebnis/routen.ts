import { Hono } from '@hono/hono'
import { anmeldungPruefen, type AuthUmgebung } from '../auth/anmeldung.ts'
import type { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import type { Sessions } from '../auth/sessions.ts'
import { ApiFehler } from '../fehler.ts'
import type { ErgebnisSpeicher } from './speicher.ts'

/**
 * ERGEBNIS-ROUTEN unter /api/results (nur lesen, nur eigene Ergebnisse)
 *   GET /?limit=10&offset=0  eine Seite der eigenen Ergebnisse, neueste zuerst (ADR-033)
 *   GET /stats               Siege, Niederlagen, Quote; der Server rechnet
 * Der Nutzer kommt immer aus der Session, nie aus der URL: Fremde Ergebnisse sind nicht abrufbar.
 */

/** Grenzen für GET /results laut openapi.yaml (max. 100 schützt vor riesigen Antworten) */
const LIMIT = { standard: 10, max: 100 }

/**
 * Routen unter /api/results. Beide lesen nur. Einträge legt der Server selbst beim Spielende an
 * (ADR-014, ADR-029), deshalb gibt es kein POST.
 */
export function ergebnisRouten(
  sessions: Sessions,
  nutzerSpeicher: NutzerSpeicher,
  ergebnisse: ErgebnisSpeicher,
) {
  const routen = new Hono<AuthUmgebung>()
  routen.use(anmeldungPruefen(sessions, nutzerSpeicher))

  // Eine Seite der eigenen Ergebnisse, neueste zuerst. offset überspringt, limit begrenzt.
  routen.get('/', (c) => {
    const limit = zahlLesen(c.req.query('limit'), 'limit', LIMIT.standard, 1, LIMIT.max)
    const offset = zahlLesen(c.req.query('offset'), 'offset', 0, 0, Infinity)
    const alle = ergebnisse.vonNutzer(c.get('nutzer').id)
    return c.json(alle.slice(offset, offset + limit))
  })

  routen.get('/stats', (c) => c.json(ergebnisse.statistik(c.get('nutzer').id)))

  return routen
}

/** Ganze Zahl aus der Query. Fehlt sie, gilt der Standard. Sonst 400 außerhalb der Grenzen. */
function zahlLesen(
  wert: string | undefined,
  feld: string,
  standard: number,
  min: number,
  max: number,
): number {
  if (wert === undefined) return standard
  const zahl = Number(wert)
  if (wert === '' || !Number.isInteger(zahl) || zahl < min || zahl > max) {
    const bereich = max === Infinity ? `ab ${min}` : `von ${min} bis ${max}`
    throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', {
      details: [{ feld, problem: `Erwartet wird eine ganze Zahl ${bereich}.` }],
    })
  }
  return zahl
}
