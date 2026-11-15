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

/** HttpOnly: kein JavaScript im Browser kann das Cookie lesen. Lax: nicht bei fremden Formularen. */
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
    if (!gespeichert || !(await passwortPruefen(passwort, gespeichert.passwortHash))) {
      throw new ApiFehler(401, 'NICHT_ANGEMELDET', 'Name oder Passwort falsch.')
    }
    return c.json(sessionStarten(c, gespeichert))
  })

  const geschuetzt = anmeldungPruefen(sessions, speicher)

  routen.post('/logout', geschuetzt, (c) => {
    sessions.beenden(c.get('sid'))
    deleteCookie(c, COOKIE_NAME, { path: '/api' })
    return c.body(null, 204)
  })

  routen.get('/me', geschuetzt, (c) => c.json(c.get('nutzer')))

  return routen
}
