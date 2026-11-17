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
const NUTZER_DATEI = `${DATEN_ORDNER}/nutzer.json`
const ERGEBNIS_DATEI = `${DATEN_ORDNER}/ergebnisse.json`

/**
 * Was Tests zusätzlich festlegen können. Ohne Angabe gelten echte Uhr und echter Zufall, und
 * Ergebnisse bleiben nur im Speicher.
 */
export type AppOptionen = Partial<Umgebung> & {
  matches?: MatchSpeicher
  turniere?: TurnierSpeicher
  ergebnisse?: ErgebnisSpeicher
}

/** Baut die App. Tests geben eigene Sessions und einen Speicher im Temp-Ordner hinein. */
export function appErstellen(
  sessions: Sessions,
  speicher: NutzerSpeicher,
  {
    matches = new MatchSpeicher(),
    turniere = new TurnierSpeicher(),
    ergebnisse = ErgebnisSpeicher.imSpeicher(),
    uhr = () => new Date(),
    zufall = Math.random,
  }: AppOptionen = {},
) {
  const app = new Hono().basePath('/api')

  app.use(logger())
  app.onError(fehlerBehandeln)
  app.notFound(nichtGefunden)

  app.get('/health', (c) => c.json({ status: 'ok', serverZeit: new Date().toISOString() }))
  app.route('/auth', authRouten(sessions, speicher))
  // Match- und Turnier-Routen teilen sich denselben Spielstand
  const stand: Spielstand = { matches, turniere, ergebnisse, uhr, zufall }
  app.route('/matches', matchRouten(sessions, speicher, stand))
  app.route('/competitions', turnierRouten(sessions, speicher, stand))
  app.route('/results', ergebnisRouten(sessions, speicher, ergebnisse))

  return app
}

if (import.meta.main) {
  await Deno.mkdir(DATEN_ORDNER, { recursive: true })
  const speicher = await NutzerSpeicher.laden(NUTZER_DATEI)
  const ergebnisse = await ErgebnisSpeicher.laden(ERGEBNIS_DATEI)
  const app = appErstellen(new Sessions(), speicher, { ergebnisse })
  Deno.serve({ port: 8000 }, app.fetch)
}
