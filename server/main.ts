import { Hono } from '@hono/hono'
import { logger } from '@hono/hono/logger'
import { NutzerSpeicher } from './auth/nutzerSpeicher.ts'
import { authRouten } from './auth/routen.ts'
import { Sessions } from './auth/sessions.ts'
import { fehlerBehandeln, nichtGefunden } from './fehler.ts'
import { matchRouten, type Umgebung } from './match/routen.ts'
import { MatchSpeicher } from './match/speicher.ts'

/** Pfade relativ zum Ordner server/, dort startet deno task dev */
const DATEN_ORDNER = 'data'
const NUTZER_DATEI = `${DATEN_ORDNER}/nutzer.json`

/** Was Tests zusätzlich festlegen können; ohne Angabe gelten echte Uhr und echter Zufall */
export type AppOptionen = Partial<Umgebung> & { matches?: MatchSpeicher }

/** Baut die App. Tests geben eigene Sessions und einen Speicher im Temp-Ordner hinein. */
export function appErstellen(
  sessions: Sessions,
  speicher: NutzerSpeicher,
  { matches = new MatchSpeicher(), uhr = () => new Date(), zufall = Math.random }: AppOptionen = {},
) {
  const app = new Hono().basePath('/api')

  app.use(logger())
  app.onError(fehlerBehandeln)
  app.notFound(nichtGefunden)

  app.get('/health', (c) => c.json({ status: 'ok', serverZeit: new Date().toISOString() }))
  app.route('/auth', authRouten(sessions, speicher))
  app.route('/matches', matchRouten(sessions, speicher, matches, { uhr, zufall }))

  return app
}

if (import.meta.main) {
  await Deno.mkdir(DATEN_ORDNER, { recursive: true })
  const speicher = await NutzerSpeicher.laden(NUTZER_DATEI)
  const app = appErstellen(new Sessions(), speicher)
  Deno.serve({ port: 8000 }, app.fetch)
}
