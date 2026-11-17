import { Hono } from '@hono/hono'
import type { Context } from '@hono/hono'
import type { AnfrageAntwort, MatchAnlegen, Schwierigkeit } from '../../shared/types.ts'
import { anmeldungPruefen, type AuthUmgebung } from '../auth/anmeldung.ts'
import type { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import type { Sessions } from '../auth/sessions.ts'
import { ApiFehler } from '../fehler.ts'
import type { Zufall } from '../spiellogik/generator.ts'
import {
  anfrageStellen,
  aufgeben,
  beitreten,
  bereitBestaetigen,
  computerMatchErstellen,
  duellErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
  teilnehmer,
} from './ablauf.ts'
import {
  ergebnisseSichern,
  offenesMatch,
  offenesTurnier,
  type Spielstand,
} from '../turnier/nachtragen.ts'
import { ansichtFuer } from './ansicht.ts'
import { abrufMerken, fristenPruefen } from './fristpruefung.ts'
import { CODE_ZEICHEN, codeNormieren, freienCodeErzeugen } from './spielcode.ts'
import type { MatchIntern } from './typen.ts'

/** Uhr und Zufall von außen, damit Tests beides festlegen können */
export type Umgebung = { uhr: () => Date; zufall: Zufall }

const SCHWIERIGKEITEN: Schwierigkeit[] = ['einfach', 'standard', 'schwer']

/** Alle Routen unter /api/matches. Jede verlangt eine Anmeldung. */
export function matchRouten(sessions: Sessions, nutzerSpeicher: NutzerSpeicher, s: Spielstand) {
  const { matches, turniere, uhr, zufall } = s
  const routen = new Hono<AuthUmgebung>()
  routen.use(anmeldungPruefen(sessions, nutzerSpeicher))

  /**
   * Match zur Id aus dem Pfad oder 404. Jede Route unter /:id holt das Match hier. So prüft der
   * Server bei jedem Zugriff die Fristen, und jeder Zugriff gilt als Lebenszeichen.
   */
  async function matchHolen(c: Context<AuthUmgebung>): Promise<MatchIntern> {
    const match = matches.holen(c.req.param('id') ?? '')
    if (!match) throw new ApiFehler(404, 'NICHT_GEFUNDEN', 'Das Match gibt es nicht.')
    const nutzerId = c.get('nutzer').id
    // Erst die Teilnahme: Fremde lösen keine Fristen aus und erfahren nichts über das Match
    teilnehmer(match, nutzerId)
    const jetzt = uhr()
    // Erst Fristen, dann Lebenszeichen. Sonst tilgt die Rückkehr eine abgelaufene Abruffrist.
    fristenPruefen(match, jetzt, zufall)
    abrufMerken(match, nutzerId, jetzt)
    // Hat eine Frist das Match beendet, steht das Ergebnis auch dann fest, wenn die Route danach 409 meldet
    await ergebnisseSichern(s, match)
    return match
  }

  /**
   * Wer in einem offenen Match oder Turnier steckt, startet nichts Neues (409). Ein Turnier sperrt
   * auch zwischen zwei Runden, wenn gerade kein Match offen ist.
   */
  async function nichtsOffen(nutzerId: string, nachricht: string): Promise<void> {
    if (await offenesMatch(s, nutzerId) || await offenesTurnier(s, nutzerId)) {
      throw new ApiFehler(409, 'KONFLIKT', nachricht)
    }
  }

  /** Antwortet mit der Sicht des angemeldeten Spielers. Endete das Match gerade, erst das Ergebnis. */
  async function ansicht(c: Context<AuthUmgebung>, match: MatchIntern, status: 200 | 201 = 200) {
    await ergebnisseSichern(s, match)
    return c.json(ansichtFuer(match, c.get('nutzer').id, uhr()), status)
  }

  routen.post('/', async (c) => {
    const nutzer = c.get('nutzer')
    const eingabe = matchAnlegenLesen(await jsonLesen(c))
    await nichtsOffen(nutzer.id, 'Du spielst bereits ein Match oder Turnier.')

    if (eingabe.modus === 'duell') {
      // Der Code darf keinem anderen wartenden Duell gehören
      // Der Code darf auch keinem wartenden Turnier gehören, sonst wäre er doppeldeutig
      const code = freienCodeErzeugen(
        (k) => matches.nachCode(k) !== null || turniere.nachCode(k) !== null,
        zufall,
      )
      const match = duellErstellen(nutzer, code, uhr())
      matches.anlegen(match)
      return ansicht(c, match, 201)
    }

    const match = computerMatchErstellen(nutzer, eingabe.schwierigkeit, uhr(), zufall)
    matches.anlegen(match)
    await nutzerSpeicher.schwierigkeitMerken(nutzer.id, eingabe.schwierigkeit)
    return ansicht(c, match, 201)
  })

  // Steht vor /:id, sonst hielte Hono "join" für eine Match-Id
  routen.post('/join', async (c) => {
    const nutzer = c.get('nutzer')
    const code = codeLesen(await jsonLesen(c))

    // Erst die Fristen des gefundenen Duells: Ein abgelaufener Code gilt nicht mehr
    const match = matches.nachCode(code)
    if (match) fristenPruefen(match, uhr(), zufall)
    if (!match || match.status !== 'wartet') {
      throw new ApiFehler(404, 'CODE_UNGUELTIG', 'Der Spielcode ist ungültig oder abgelaufen.')
    }
    // Auch das eigene wartende Duell zählt als offenes Match: Der Ersteller bekommt hier 409
    await nichtsOffen(nutzer.id, 'Du kannst diesem Spiel nicht beitreten.')

    beitreten(match, nutzer, uhr())
    return ansicht(c, match)
  })

  // Steht vor /:id, sonst hielte Hono "current" für eine Match-Id
  // Kein Lebenszeichen: Das Dashboard schaut nur nach, der Spieler ist nicht im Spiel
  routen.get('/current', async (c) => {
    const match = await offenesMatch(s, c.get('nutzer').id)
    if (!match) throw new ApiFehler(404, 'NICHT_GEFUNDEN', 'Du hast kein offenes Match.')
    return ansicht(c, match)
  })

  routen.get('/:id', async (c) => {
    // matchHolen prüft die Teilnahme zuerst: Fremde erkennen nicht einmal an der 304, ob sich etwas tut
    const match = await matchHolen(c)
    if (sinceLesen(c.req.query('since')) === match.version) return c.body(null, 304)
    return ansicht(c, match)
  })

  routen.put('/:id/labyrinth', async (c) => {
    const match = await matchHolen(c)
    entwurfSpeichern(match, c.get('nutzer').id, await jsonLesen(c))
    return ansicht(c, match)
  })

  routen.post('/:id/labyrinth/place', async (c) => {
    const match = await matchHolen(c)
    labyrinthSetzen(match, c.get('nutzer').id, uhr())
    return ansicht(c, match)
  })

  routen.post('/:id/ready', async (c) => {
    const match = await matchHolen(c)
    bereitBestaetigen(match, c.get('nutzer').id, uhr(), zufall)
    return ansicht(c, match)
  })

  routen.post('/:id/queries', async (c) => {
    const match = await matchHolen(c)
    const nutzerId = c.get('nutzer').id
    const { ergebnis, computerAnfragen } = anfrageStellen(
      match,
      nutzerId,
      await jsonLesen(c),
      uhr(),
      zufall,
    )
    await ergebnisseSichern(s, match)
    const antwort: AnfrageAntwort = {
      ...ergebnis,
      computerAnfragen,
      match: ansichtFuer(match, nutzerId, uhr()),
    }
    return c.json(antwort)
  })

  routen.post('/:id/resign', async (c) => {
    const match = await matchHolen(c)
    aufgeben(match, c.get('nutzer').id, uhr())
    return ansicht(c, match)
  })

  return routen
}

/** Kaputtes JSON wird zu null. Die Prüfung danach meldet dann 400. */
function jsonLesen(c: Context): Promise<unknown> {
  return c.req.json().catch(() => null)
}

/** Body von POST /matches. Die Schwierigkeit ist im Modus computer Pflicht, im Duell verboten. */
function matchAnlegenLesen(eingabe: unknown): MatchAnlegen {
  const ungueltig = (feld: string, problem: string) =>
    new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', { details: [{ feld, problem }] })

  if (typeof eingabe !== 'object' || eingabe === null || Array.isArray(eingabe)) {
    throw ungueltig('body', 'Erwartet wird ein JSON-Objekt.')
  }
  const { modus, schwierigkeit } = eingabe as Record<string, unknown>
  if (modus === 'duell') {
    if (schwierigkeit !== undefined) {
      throw ungueltig('schwierigkeit', 'Gegen einen Live-Gegner gibt es keine Schwierigkeit.')
    }
    return { modus: 'duell' }
  }
  if (modus !== 'computer') throw ungueltig('modus', 'Erwartet wird computer oder duell.')
  if (!SCHWIERIGKEITEN.includes(schwierigkeit as Schwierigkeit)) {
    throw ungueltig('schwierigkeit', 'Erwartet wird einfach, standard oder schwer.')
  }
  return { modus: 'computer', schwierigkeit: schwierigkeit as Schwierigkeit }
}

/** Erlaubte Form eines Codes nach dem Normieren, wie das Muster Code in der openapi.yaml */
const CODE_MUSTER = new RegExp(`^[${CODE_ZEICHEN}]{5}$`)

/** Body von POST /matches/join. Kleinbuchstaben und Leerzeichen am Rand sind erlaubt. */
function codeLesen(eingabe: unknown): string {
  const code = typeof eingabe === 'object' && eingabe !== null
    ? (eingabe as Record<string, unknown>).code
    : undefined
  if (typeof code !== 'string' || !CODE_MUSTER.test(codeNormieren(code))) {
    throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', {
      details: [{ feld: 'code', problem: 'Erwartet werden fünf Zeichen ohne 0, O, 1 und I.' }],
    })
  }
  return codeNormieren(code)
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
