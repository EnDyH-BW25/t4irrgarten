/**
 * EINSTIEGSPUNKT DES SERVERS (Deno + Hono)
 * Baut die App aus vier Routen-Gruppen zusammen und startet sie auf Port 8000.
 * Start: deno task dev (aus server/). Der Vite-Proxy des Clients leitet /api hierher.
 *
 * Aufbau des Servers in Schichten (von außen nach innen):
 *   routen.ts       HTTP: Request lesen, Anmeldung prüfen, Antwort schicken
 *   ablauf.ts       Spielablauf: Status ändern, Regeln anwenden, ApiFehler werfen
 *   speicher.ts     Daten halten (Map im Speicher oder JSON-Datei)
 *   spiellogik/     reine Funktionen ohne HTTP und ohne Speicher (Mauern, Wege, Computer)
 * Die ersten drei gibt es je Ordner: auth/, match/, turnier/, ergebnis/
 */
import { Hono } from '@hono/hono'
import { logger } from '@hono/hono/logger'
import { NutzerSpeicher } from './auth/nutzerSpeicher.ts'
import { authRouten } from './auth/routen.ts'
import { Sessions } from './auth/sessions.ts'
import { ergebnisRouten } from './ergebnis/routen.ts'
import { ErgebnisSpeicher } from './ergebnis/speicher.ts'
import { fehlerBehandeln, nichtGefunden } from './fehler.ts'
import { matchRouten, type Umgebung } from './match/routen.ts'
import { MatchSpeicher } from './match/speicher.ts'
import type { Spielstand } from './turnier/nachtragen.ts'
import { turnierRouten } from './turnier/routen.ts'
import { TurnierSpeicher } from './turnier/speicher.ts'

/** Pfade relativ zum Ordner server/, dort startet deno task dev */
const DATEN_ORDNER = 'data'
const NUTZER_DATEI = `${DATEN_ORDNER}/nutzer.json` // dauerhaft: Konten mit Passwort-Hash
const ERGEBNIS_DATEI = `${DATEN_ORDNER}/ergebnisse.json` // dauerhaft: beendete Spiele (ADR-029)

/**
 * Was Tests zusätzlich festlegen können. Ohne Angabe gelten echte Uhr und echter Zufall, und
 * Ergebnisse bleiben nur im Speicher.
 * uhr und zufall als Parameter = Dependency Injection: Tests geben eine feste Uhr und einen
 * festen Zufall hinein und bekommen so wiederholbare Ergebnisse (z. B. Fristablauf testen).
 */
export type AppOptionen = Partial<Umgebung> & {
  matches?: MatchSpeicher
  turniere?: TurnierSpeicher
  ergebnisse?: ErgebnisSpeicher
}

/**
 * Baut die App. Tests geben eigene Sessions und einen Speicher im Temp-Ordner hinein.
 * Die Funktion startet keinen Server. Tests rufen app.request(...) direkt auf, ohne Netzwerk.
 */
export function appErstellen(
  sessions: Sessions,
  speicher: NutzerSpeicher,
  {
    // Standardwerte per Destructuring: Was der Aufrufer nicht angibt, wird hier frisch erzeugt
    matches = new MatchSpeicher(),
    turniere = new TurnierSpeicher(),
    ergebnisse = ErgebnisSpeicher.imSpeicher(),
    uhr = () => new Date(),
    zufall = Math.random,
  }: AppOptionen = {},
) {
  const app = new Hono().basePath('/api') // alle Routen beginnen mit /api

  app.use(logger()) // Middleware: schreibt jeden Request in die Konsole
  app.onError(fehlerBehandeln) // jeder geworfene Fehler landet hier und wird zu JSON
  app.notFound(nichtGefunden) // unbekannte Route => 404 im eigenen Fehlerformat

  app.get('/health', (c) => c.json({ status: 'ok', serverZeit: new Date().toISOString() }))
  // app.route hängt eine Unter-App unter einem Pfad ein, z. B. /api/auth/login
  app.route('/auth', authRouten(sessions, speicher))
  // Match- und Turnier-Routen teilen sich denselben Spielstand
  const stand: Spielstand = { matches, turniere, ergebnisse, uhr, zufall }
  app.route('/matches', matchRouten(sessions, speicher, stand))
  app.route('/competitions', turnierRouten(sessions, speicher, stand))
  app.route('/results', ergebnisRouten(sessions, speicher, ergebnisse))

  return app
}

// import.meta.main ist nur true, wenn diese Datei direkt gestartet wird (nicht beim Import im Test)
if (import.meta.main) {
  await Deno.mkdir(DATEN_ORDNER, { recursive: true }) // data/ anlegen, falls er fehlt
  const speicher = await NutzerSpeicher.laden(NUTZER_DATEI)
  const ergebnisse = await ErgebnisSpeicher.laden(ERGEBNIS_DATEI)
  // Sessions, Matches und Turniere liegen nur im Arbeitsspeicher (ADR-023, ADR-026):
  // Nach einem Neustart sind sie weg, Konten und Ergebnisse bleiben.
  const app = appErstellen(new Sessions(), speicher, { ergebnisse })
  Deno.serve({ port: 8000 }, app.fetch)
}
