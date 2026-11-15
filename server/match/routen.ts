import { Hono } from '@hono/hono'
import type { Context } from '@hono/hono'
import type { AnfrageAntwort, Schwierigkeit } from '../../shared/types.ts'
import { anmeldungPruefen, type AuthUmgebung } from '../auth/anmeldung.ts'
import type { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import type { Sessions } from '../auth/sessions.ts'
import { ApiFehler } from '../fehler.ts'
import type { Zufall } from '../spiellogik/generator.ts'
import {
  anfrageStellen,
  aufgeben,
  computerMatchErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
  teilnehmer,
} from './ablauf.ts'
import { ansichtFuer } from './ansicht.ts'
import type { MatchSpeicher } from './speicher.ts'
import type { MatchIntern } from './typen.ts'

/** Uhr und Zufall von außen, damit Tests beides festlegen können */
export type Umgebung = { uhr: () => Date; zufall: Zufall }

const SCHWIERIGKEITEN: Schwierigkeit[] = ['einfach', 'standard', 'schwer']

/** Alle Routen unter /api/matches. Jede verlangt eine Anmeldung. */
export function matchRouten(
  sessions: Sessions,
  nutzerSpeicher: NutzerSpeicher,
  matches: MatchSpeicher,
  { uhr, zufall }: Umgebung,
) {
  const routen = new Hono<AuthUmgebung>()
  routen.use(anmeldungPruefen(sessions, nutzerSpeicher))

  /** Match zur Id aus dem Pfad oder 404 */
  function matchHolen(c: Context): MatchIntern {
    const match = matches.holen(c.req.param('id') ?? '')
    if (!match) throw new ApiFehler(404, 'NICHT_GEFUNDEN', 'Das Match gibt es nicht.')
    return match
  }

  /** Antwortet mit der Sicht des angemeldeten Spielers */
  function ansicht(c: Context<AuthUmgebung>, match: MatchIntern, status: 200 | 201 = 200) {
    return c.json(ansichtFuer(match, c.get('nutzer').id, uhr()), status)
  }

  routen.post('/', async (c) => {
    const nutzer = c.get('nutzer')
    const schwierigkeit = matchAnlegenLesen(await jsonLesen(c))
    if (matches.offenesMatchVon(nutzer.id)) {
      throw new ApiFehler(409, 'KONFLIKT', 'Du spielst bereits ein Match.')
    }
    const match = computerMatchErstellen(nutzer, schwierigkeit, uhr(), zufall)
    matches.anlegen(match)
    return ansicht(c, match, 201)
  })

  routen.get('/:id', (c) => {
    const match = matchHolen(c)
    // Erst die Teilnahme: Fremde sollen nicht einmal an der 304 erkennen, ob sich etwas tut
    teilnehmer(match, c.get('nutzer').id)
    if (sinceLesen(c.req.query('since')) === match.version) return c.body(null, 304)
    return ansicht(c, match)
  })

  routen.put('/:id/labyrinth', async (c) => {
    const match = matchHolen(c)
    entwurfSpeichern(match, c.get('nutzer').id, await jsonLesen(c))
    return ansicht(c, match)
  })

  routen.post('/:id/labyrinth/place', (c) => {
    const match = matchHolen(c)
    labyrinthSetzen(match, c.get('nutzer').id, zufall)
    return ansicht(c, match)
  })

  routen.post('/:id/queries', async (c) => {
    const match = matchHolen(c)
    const nutzerId = c.get('nutzer').id
    const { ergebnis, computerAnfragen } = anfrageStellen(
      match,
      nutzerId,
      await jsonLesen(c),
      zufall,
    )
    const antwort: AnfrageAntwort = {
      ...ergebnis,
      computerAnfragen,
      match: ansichtFuer(match, nutzerId, uhr()),
    }
    return c.json(antwort)
  })

  routen.post('/:id/resign', (c) => {
    const match = matchHolen(c)
    aufgeben(match, c.get('nutzer').id)
    return ansicht(c, match)
  })

  return routen
}

/** Kaputtes JSON wird zu null. Die Prüfung danach meldet dann 400. */
function jsonLesen(c: Context): Promise<unknown> {
  return c.req.json().catch(() => null)
}

/** Body von POST /matches. In Phase 3 gibt es nur den Modus computer. */
function matchAnlegenLesen(eingabe: unknown): Schwierigkeit {
  const ungueltig = (feld: string, problem: string) =>
    new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', { details: [{ feld, problem }] })

  if (typeof eingabe !== 'object' || eingabe === null || Array.isArray(eingabe)) {
    throw ungueltig('body', 'Erwartet wird ein JSON-Objekt.')
  }
  const { modus, schwierigkeit } = eingabe as Record<string, unknown>
  if (modus === 'duell') throw ungueltig('modus', 'Das Duell folgt in einer späteren Version.')
  if (modus !== 'computer') throw ungueltig('modus', 'Erwartet wird computer oder duell.')
  if (!SCHWIERIGKEITEN.includes(schwierigkeit as Schwierigkeit)) {
    throw ungueltig('schwierigkeit', 'Erwartet wird einfach, standard oder schwer.')
  }
  return schwierigkeit as Schwierigkeit
}

/** Query-Parameter since: fehlt er, gibt es keinen Vergleich */
function sinceLesen(wert: string | undefined): number | null {
  if (wert === undefined) return null
  const zahl = Number(wert)
  if (wert === '' || !Number.isInteger(zahl) || zahl < 0) {
    throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', {
      details: [{ feld: 'since', problem: 'Erwartet wird eine ganze Zahl ab 0.' }],
    })
  }
  return zahl
}
