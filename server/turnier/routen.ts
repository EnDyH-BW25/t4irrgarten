import { Hono } from '@hono/hono'
import type { Context } from '@hono/hono'
import { TURNIER_GROESSE } from '../../shared/types.ts'
import type { Schwierigkeit, TurnierAnlegen } from '../../shared/types.ts'
import { anmeldungPruefen, type AuthUmgebung } from '../auth/anmeldung.ts'
import type { NutzerSpeicher } from '../auth/nutzerSpeicher.ts'
import type { Sessions } from '../auth/sessions.ts'
import { ApiFehler } from '../fehler.ts'
import { CODE_ZEICHEN, codeNormieren, freienCodeErzeugen } from '../match/spielcode.ts'
import {
  turnierBeitreten,
  turnierErstellen,
  turnierStarten,
  turnierTeilnehmer,
  turnierVerlassen,
} from './ablauf.ts'
import { turnierAnsichtFuer } from './ansicht.ts'
import { offenesMatch, offenesTurnier, type Spielstand, turnierNachtragen } from './nachtragen.ts'
import type { TurnierIntern } from './typen.ts'

const SCHWIERIGKEITEN: Schwierigkeit[] = ['einfach', 'standard', 'schwer']
const CODE_MUSTER = new RegExp(`^[${CODE_ZEICHEN}]{5}$`)

/** Alle Routen unter /api/competitions. Jede verlangt eine Anmeldung. */
export function turnierRouten(sessions: Sessions, nutzerSpeicher: NutzerSpeicher, s: Spielstand) {
  const { matches, turniere, uhr, zufall } = s
  const routen = new Hono<AuthUmgebung>()
  routen.use(anmeldungPruefen(sessions, nutzerSpeicher))

  /** Turnier zur Id oder 404; danach Teilnahme (403) und Nachtragen, wie matchHolen */
  async function turnierHolen(c: Context<AuthUmgebung>): Promise<TurnierIntern> {
    const turnier = turniere.holen(c.req.param('id') ?? '')
    if (!turnier) throw new ApiFehler(404, 'NICHT_GEFUNDEN', 'Das Turnier gibt es nicht.')
    turnierTeilnehmer(turnier, c.get('nutzer').id)
    await turnierNachtragen(s, turnier)
    return turnier
  }

  function ansicht(c: Context<AuthUmgebung>, turnier: TurnierIntern, status: 200 | 201 = 200) {
    return c.json(turnierAnsichtFuer(turnier, c.get('nutzer').id, matches, uhr()), status)
  }

  /** Wer in einem offenen Match oder Turnier steckt, beginnt kein neues Turnier (409) */
  async function nichtsOffen(nutzerId: string, nachricht: string): Promise<void> {
    if (await offenesMatch(s, nutzerId) || await offenesTurnier(s, nutzerId)) {
      throw new ApiFehler(409, 'KONFLIKT', nachricht)
    }
  }

  routen.post('/', async (c) => {
    const nutzer = c.get('nutzer')
    const eingabe = anlegenLesen(await jsonLesen(c))
    await nichtsOffen(nutzer.id, 'Du spielst bereits ein Match oder Turnier.')

    // Ein Code gehört nie gleichzeitig einem Duell und einem Turnier
    const code = freienCodeErzeugen(
      (k) => matches.nachCode(k) !== null || turniere.nachCode(k) !== null,
      zufall,
    )
    const turnier = turnierErstellen(nutzer, eingabe.schwierigkeit, code, uhr())
    turniere.anlegen(turnier)
    return ansicht(c, turnier, 201)
  })

  // Steht vor /:id, sonst hielte Hono "join" für eine Turnier-Id
  routen.post('/join', async (c) => {
    const nutzer = c.get('nutzer')
    const code = codeLesen(await jsonLesen(c))

    // Erst nachtragen: Ein abgelaufener Code gilt nicht mehr. Ein Duell-Code findet hier nichts.
    const turnier = turniere.nachCode(code)
    if (turnier) await turnierNachtragen(s, turnier)
    if (!turnier || turnier.status !== 'wartet') {
      throw new ApiFehler(404, 'CODE_UNGUELTIG', 'Der Spielcode ist ungültig oder abgelaufen.')
    }
    await nichtsOffen(nutzer.id, 'Du spielst bereits ein Match oder Turnier.')

    turnierBeitreten(turnier, nutzer)
    return ansicht(c, turnier)
  })

  // Steht vor /:id; findet das Turnier auch zwischen zwei Runden wieder
  routen.get('/current', async (c) => {
    const turnier = await offenesTurnier(s, c.get('nutzer').id)
    if (!turnier) throw new ApiFehler(404, 'NICHT_GEFUNDEN', 'Du hast kein offenes Turnier.')
    return ansicht(c, turnier)
  })

  routen.get('/:id', async (c) => ansicht(c, await turnierHolen(c)))

  routen.post('/:id/start', async (c) => {
    const turnier = await turnierHolen(c)
    const neue = turnierStarten(turnier, c.get('nutzer').id, uhr(), zufall)
    for (const match of neue) matches.anlegen(match)
    return ansicht(c, turnier)
  })

  routen.delete('/:id/participants/me', async (c) => {
    const turnier = await turnierHolen(c)
    turnierVerlassen(turnier, c.get('nutzer').id)
    return c.body(null, 204)
  })

  return routen
}

function jsonLesen(c: Context): Promise<unknown> {
  return c.req.json().catch(() => null)
}

function ungueltig(feld: string, problem: string) {
  return new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', { details: [{ feld, problem }] })
}

/** Body von POST /competitions: heute nur Größe 4 */
function anlegenLesen(eingabe: unknown): TurnierAnlegen {
  if (typeof eingabe !== 'object' || eingabe === null || Array.isArray(eingabe)) {
    throw ungueltig('body', 'Erwartet wird ein JSON-Objekt.')
  }
  const { groesse, schwierigkeit } = eingabe as Record<string, unknown>
  if (groesse !== TURNIER_GROESSE) throw ungueltig('groesse', 'Erwartet wird 4.')
  if (!SCHWIERIGKEITEN.includes(schwierigkeit as Schwierigkeit)) {
    throw ungueltig('schwierigkeit', 'Erwartet wird einfach, standard oder schwer.')
  }
  return { groesse, schwierigkeit: schwierigkeit as Schwierigkeit }
}

/** Body von POST /competitions/join; Kleinbuchstaben und Leerzeichen am Rand sind erlaubt */
function codeLesen(eingabe: unknown): string {
  const code = typeof eingabe === 'object' && eingabe !== null
    ? (eingabe as Record<string, unknown>).code
    : undefined
  if (typeof code !== 'string' || !CODE_MUSTER.test(codeNormieren(code))) {
    throw ungueltig('code', 'Erwartet werden fünf Zeichen ohne 0, O, 1 und I.')
  }
  return codeNormieren(code)
}
