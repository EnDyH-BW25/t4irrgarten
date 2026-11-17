import { TURNIER_GROESSE, TURNIER_MIN_START } from '../../shared/types.ts'
import type { Nutzer, Schwierigkeit } from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { beitreten, COMPUTER, computerMatchErstellen, duellErstellen } from '../match/ablauf.ts'
import type { MatchIntern } from '../match/typen.ts'
import type { Zufall } from '../spiellogik/generator.ts'
import type { TeilnehmerIntern, TurnierIntern } from './typen.ts'

/** Gültigkeit des Turnier-Codes ohne Start (ADR-010) */
export const TURNIER_CODE_DAUER_MS = 30 * 60 * 1000

// ---------- Warteraum ----------

/** Legt ein Turnier an. Der Ersteller ist Host und erster Teilnehmer. */
export function turnierErstellen(
  nutzer: Pick<Nutzer, 'id' | 'name'>,
  schwierigkeit: Schwierigkeit,
  code: string,
  jetzt: Date,
): TurnierIntern {
  return {
    id: crypto.randomUUID(),
    groesse: TURNIER_GROESSE,
    schwierigkeit,
    status: 'wartet',
    hostId: nutzer.id,
    code,
    codeEndeAm: new Date(jetzt.getTime() + TURNIER_CODE_DAUER_MS),
    teilnehmer: [{ id: nutzer.id, name: nutzer.name, istComputer: false }],
    runden: [],
    platzierungen: [],
  }
}

/** Tritt dem Turnier bei. Den Code hat die Route schon über den TurnierSpeicher gefunden. */
export function turnierBeitreten(turnier: TurnierIntern, nutzer: Pick<Nutzer, 'id' | 'name'>) {
  if (turnier.status !== 'wartet') {
    throw new ApiFehler(409, 'COMPETITION_VOLL', 'Das Turnier läuft bereits.')
  }
  if (turnier.teilnehmer.some((t) => t.id === nutzer.id)) {
    throw new ApiFehler(409, 'KONFLIKT', 'Du nimmst schon an diesem Turnier teil.')
  }
  if (turnier.teilnehmer.length >= turnier.groesse) {
    throw new ApiFehler(409, 'COMPETITION_VOLL', 'Das Turnier hat keinen freien Platz mehr.')
  }
  turnier.teilnehmer.push({ id: nutzer.id, name: nutzer.name, istComputer: false })
}

/** Liefert den Teilnehmer oder 403, wie teilnehmer() beim Match */
export function turnierTeilnehmer(turnier: TurnierIntern, nutzerId: string): TeilnehmerIntern {
  const ich = turnier.teilnehmer.find((t) => t.id === nutzerId)
  if (!ich) throw new ApiFehler(403, 'VERBOTEN', 'Du nimmst an diesem Turnier nicht teil.')
  return ich
}

/** Verlässt den Warteraum. Geht der Host, endet das Turnier, und der Code wird ungültig. */
export function turnierVerlassen(turnier: TurnierIntern, nutzerId: string): void {
  turnierTeilnehmer(turnier, nutzerId)
  if (turnier.status !== 'wartet') {
    throw new ApiFehler(409, 'KONFLIKT', 'Das Turnier hat schon begonnen. Gib im Match auf.')
  }
  if (nutzerId === turnier.hostId) turnierAbbrechen(turnier)
  else turnier.teilnehmer = turnier.teilnehmer.filter((t) => t.id !== nutzerId)
}

/** Warteraum: Nach 30 Minuten ohne Start endet das Turnier. Gibt true zurück, wenn es abbrach. */
export function codefristPruefen(turnier: TurnierIntern, jetzt: Date): boolean {
  if (turnier.status !== 'wartet') return false
  if (jetzt.getTime() < turnier.codeEndeAm!.getTime()) return false
  turnierAbbrechen(turnier)
  return true
}

/** Endet ohne Wertung: Host weg, Code abgelaufen oder ein Match ohne Spieler */
export function turnierAbbrechen(turnier: TurnierIntern): void {
  turnier.status = 'abgebrochen'
  turnier.code = null
  turnier.codeEndeAm = null
}

// ---------- Start ----------

/**
 * Der Host startet ab drei Spielern. Fehlt der vierte, kommt der Computer dazu. Der Server lost
 * Runde 1 aus und legt beide Matches an. Die Route speichert sie im MatchSpeicher.
 */
export function turnierStarten(
  turnier: TurnierIntern,
  nutzerId: string,
  jetzt: Date,
  zufall: Zufall = Math.random,
): MatchIntern[] {
  turnierTeilnehmer(turnier, nutzerId)
  if (nutzerId !== turnier.hostId) {
    throw new ApiFehler(403, 'VERBOTEN', 'Nur der Host startet das Turnier.')
  }
  if (turnier.status !== 'wartet') {
    throw new ApiFehler(409, 'KONFLIKT', 'Das Turnier wartet nicht mehr auf den Start.')
  }
  if (turnier.teilnehmer.length < TURNIER_MIN_START) {
    throw new ApiFehler(409, 'ZU_WENIG_SPIELER', 'Für den Start brauchst du mindestens 3 Spieler.')
  }

  // Höchstens ein Computer: Es fehlt höchstens ein Spieler (ADR-010)
  if (turnier.teilnehmer.length < turnier.groesse) {
    turnier.teilnehmer.push({ id: COMPUTER.id, name: COMPUTER.name, istComputer: true })
  }
  turnier.status = 'laeuft'
  turnier.code = null
  turnier.codeEndeAm = null

  // Auslosung: zufällige Reihenfolge, dann Plätze 1+2 und 3+4 als Paarungen.
  // Mit nur einem Computer spielt er immer gegen einen Menschen.
  const gelost = mischen(turnier.teilnehmer, zufall)
  const matches = [
    paarungAnlegen(turnier, 1, gelost[0], gelost[1], jetzt, zufall),
    paarungAnlegen(turnier, 1, gelost[2], gelost[3], jetzt, zufall),
  ]
  turnier.runden.push(matches.map((m) => ({ matchId: m.id, platzUm: [] })))
  return matches
}

/**
 * Legt das Match einer Paarung an, direkt im Aufbau. Gegen den Computer ist es ein normales
 * Computer-Match. Zwei Menschen spielen ein Duell, dem der Gegner sofort beitritt.
 */
export function paarungAnlegen(
  turnier: TurnierIntern,
  runde: number,
  a: TeilnehmerIntern,
  b: TeilnehmerIntern,
  jetzt: Date,
  zufall: Zufall,
): MatchIntern {
  let match: MatchIntern
  if (a.istComputer || b.istComputer) {
    const mensch = a.istComputer ? b : a
    match = computerMatchErstellen(mensch, turnier.schwierigkeit, jetzt, zufall)
  } else {
    // Der Code wird nie gebraucht; beitreten() löscht ihn und startet den Aufbau
    match = duellErstellen(a, '', jetzt)
    beitreten(match, b, jetzt)
  }
  match.competitionId = turnier.id
  match.runde = runde
  return match
}

/** Fisher-Yates: jede Reihenfolge gleich wahrscheinlich; die Eingabe bleibt unverändert */
function mischen<T>(liste: T[], zufall: Zufall): T[] {
  const kopie = [...liste]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}
