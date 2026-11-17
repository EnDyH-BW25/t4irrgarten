/**
 * MIDDLEWARE "anmeldungPruefen": Türsteher für alle geschützten Routen
 * Middleware = Funktion, die vor dem eigentlichen Handler läuft. Sie kann den Request
 * abbrechen (throw => 401) oder mit next() an den Handler weitergeben.
 * Ablauf: Cookie sid lesen -> Session nachschlagen -> Nutzer laden -> in c.set ablegen.
 * Danach liest jeder Handler den Nutzer einfach mit c.get('nutzer').
 * Einsatz: routen.use(anmeldungPruefen(...)) in match/, turnier/, ergebnis/ und bei logout/me.
 */
import { getCookie } from '@hono/hono/cookie'
import { createMiddleware } from '@hono/hono/factory'
import type { Nutzer } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { alsNutzer, type NutzerSpeicher } from './nutzerSpeicher.ts'
import type { Sessions } from './sessions.ts'

/** Name des Session-Cookies laut openapi.yaml */
export const COOKIE_NAME = 'sid'

/** Variablen, die anmeldungPruefen für die folgenden Handler setzt (Typ für c.get/c.set) */
export type AuthUmgebung = {
  Variables: { nutzer: Nutzer; sid: string }
}

/** Middleware für geschützte Routen: ohne gültige Session 401 */
export function anmeldungPruefen(sessions: Sessions, speicher: NutzerSpeicher) {
  return createMiddleware<AuthUmgebung>(async (c, next) => {
    // Kette mit drei Stufen; fehlt eine, ist das Ergebnis null
    const sid = getCookie(c, COOKIE_NAME)
    const nutzerId = sid ? sessions.nutzerId(sid) : null
    const gespeichert = nutzerId ? speicher.nachId(nutzerId) : null
    // Kein Cookie, unbekannte/abgelaufene Session oder gelöschter Nutzer => alles gleich 401
    if (!sid || !gespeichert) {
      throw new ApiFehler(401, 'NICHT_ANGEMELDET', 'Bitte melde dich an.')
    }
    // Ohne Passwort-Hash weitergeben, der Hash bleibt im Speicher
    c.set('nutzer', alsNutzer(gespeichert))
    c.set('sid', sid) // braucht logout, um genau diese Session zu beenden
    await next() // weiter zum eigentlichen Handler
  })
}
