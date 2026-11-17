/**
 * AUTH-ROUTEN unter /api/auth
 *   POST /register  Konto anlegen + gleich anmelden (201)
 *   POST /login     Name + Passwort prüfen, Session starten (200)
 *   POST /logout    Session beenden, Cookie löschen (204), nur angemeldet
 *   GET  /me        Wer bin ich? Für den Router-Guard im Client, nur angemeldet
 * Routen sind dünn: Prüfung in zugangsdaten.ts, Hash in passwort.ts, Daten im NutzerSpeicher.
 */
import { Hono } from '@hono/hono'
import type { Context } from '@hono/hono'
import { deleteCookie, getCookie, setCookie } from '@hono/hono/cookie'
import type { CookieOptions } from '@hono/hono/utils/cookie'
import type { Nutzer } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { anmeldungPruefen, type AuthUmgebung, COOKIE_NAME } from './anmeldung.ts'
import { alsNutzer, type GespeicherterNutzer, type NutzerSpeicher } from './nutzerSpeicher.ts'
import { passwortHashen, passwortPruefen } from './passwort.ts'
import type { Sessions } from './sessions.ts'
import { type Zugangsdaten, zugangsdatenPruefen } from './zugangsdaten.ts'

/**
 * HttpOnly: kein JavaScript im Browser kann das Cookie lesen. Lax: nicht bei fremden Formularen.
 * HttpOnly schützt vor Diebstahl per XSS, SameSite=Lax schützt vor CSRF (fremde Seite schickt
 * POST mit meinem Cookie). Kein Secure, weil lokal ohne HTTPS (offener Punkt im ADR).
 */
const COOKIE_OPTIONEN: CookieOptions = { httpOnly: true, sameSite: 'Lax', path: '/api' }

/** Liest den Body und prüft ihn; kaputtes JSON gilt als falsche Eingabe */
async function zugangsdatenLesen(c: Context): Promise<Zugangsdaten> {
  const eingabe = await c.req.json().catch(() => null)
  const ergebnis = zugangsdatenPruefen(eingabe)
  if (!ergebnis.ok) {
    throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', { details: ergebnis.details })
  }
  return ergebnis.zugangsdaten
}

// Fabrikfunktion: bekommt Sessions und Speicher hinein (Tests geben eigene) und liefert eine Unter-App
export function authRouten(sessions: Sessions, speicher: NutzerSpeicher) {
  const routen = new Hono<AuthUmgebung>()

  /** Beendet eine alte Session dieses Browsers und startet eine neue */
  function sessionStarten(c: Context, nutzer: GespeicherterNutzer): Nutzer {
    const alt = getCookie(c, COOKIE_NAME)
    if (alt) sessions.beenden(alt)
    setCookie(c, COOKIE_NAME, sessions.starten(nutzer.id), COOKIE_OPTIONEN)
    return alsNutzer(nutzer)
  }

  routen.post('/register', async (c) => {
    const { name, passwort } = await zugangsdatenLesen(c)
    const vergeben = new ApiFehler(409, 'KONFLIKT', 'Der Name ist schon vergeben.')
    // Erst prüfen, dann hashen: spart 130 ms bei vergebenen Namen
    if (speicher.nachName(name)) throw vergeben
    const neu = await speicher.anlegen(name, await passwortHashen(passwort))
    if (!neu) throw vergeben // jemand war während des Hashens schneller
    return c.json(sessionStarten(c, neu), 201)
  })

  routen.post('/login', async (c) => {
    const { name, passwort } = await zugangsdatenLesen(c)
    const gespeichert = speicher.nachName(name)
    // Dieselbe Meldung für "Name unbekannt" und "Passwort falsch": verrät nicht, welche Namen
    // existieren. Grenze: Die Laufzeit (kein Hash bei unbekanntem Namen) und 409 bei register
    // verraten es trotzdem (im ADR dokumentiert).
    if (!gespeichert || !(await passwortPruefen(passwort, gespeichert.passwortHash))) {
      throw new ApiFehler(401, 'NICHT_ANGEMELDET', 'Name oder Passwort falsch.')
    }
    return c.json(sessionStarten(c, gespeichert))
  })

  // Middleware nur für die folgenden zwei Routen (login/register müssen offen bleiben)
  const geschuetzt = anmeldungPruefen(sessions, speicher)

  routen.post('/logout', geschuetzt, (c) => {
    sessions.beenden(c.get('sid'))
    deleteCookie(c, COOKIE_NAME, { path: '/api' })
    return c.body(null, 204)
  })

  routen.get('/me', geschuetzt, (c) => c.json(c.get('nutzer')))

  return routen
}
