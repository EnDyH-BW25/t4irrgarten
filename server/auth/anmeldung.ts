import { getCookie } from '@hono/hono/cookie'
import { createMiddleware } from '@hono/hono/factory'
import type { Nutzer } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { alsNutzer, type NutzerSpeicher } from './nutzerSpeicher.ts'
import type { Sessions } from './sessions.ts'

/** Name des Session-Cookies laut openapi.yaml */
export const COOKIE_NAME = 'sid'

/** Variablen, die anmeldungPruefen für die folgenden Handler setzt */
export type AuthUmgebung = {
  Variables: { nutzer: Nutzer; sid: string }
}

/** Middleware für geschützte Routen: ohne gültige Session 401 */
export function anmeldungPruefen(sessions: Sessions, speicher: NutzerSpeicher) {
  return createMiddleware<AuthUmgebung>(async (c, next) => {
    const sid = getCookie(c, COOKIE_NAME)
    const nutzerId = sid ? sessions.nutzerId(sid) : null
    const gespeichert = nutzerId ? speicher.nachId(nutzerId) : null
    if (!sid || !gespeichert) {
      throw new ApiFehler(401, 'NICHT_ANGEMELDET', 'Bitte melde dich an.')
    }
    // Ohne Passwort-Hash weitergeben, der Hash bleibt im Speicher
    c.set('nutzer', alsNutzer(gespeichert))
    c.set('sid', sid)
    await next()
  })
}
