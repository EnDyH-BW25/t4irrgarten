import type { Spieler, Turnier } from '../../shared/types.ts'
import type { MatchSpeicher } from '../match/speicher.ts'
import type { MatchIntern } from '../match/typen.ts'
import { turnierTeilnehmer } from './ablauf.ts'
import type { TeilnehmerIntern, TurnierIntern } from './typen.ts'

/**
 * TURNIER-ANSICHT: Gegenstück zu match/ansicht.ts (TurnierIntern => Turnier für den Client)
 * Liefert zusätzlich meinNaechstesMatchId: Daran erkennt TurnierView, dass sie ins Spiel springen soll.
 *
 * Sicht eines Teilnehmers auf das Turnier. Status und Sieger jeder Paarung kommen aus ihrem Match,
 * das Turnier speichert sie nicht doppelt. Nur der Host sieht den Code.
 */
export function turnierAnsichtFuer(
  turnier: TurnierIntern,
  nutzerId: string,
  matches: MatchSpeicher,
  jetzt: Date,
): Turnier {
  turnierTeilnehmer(turnier, nutzerId)
  const istHost = nutzerId === turnier.hostId
  const person = (id: string) => turnier.teilnehmer.find((t) => t.id === id)!

  const runden = turnier.runden.map((runde, i) => ({
    nr: i + 1,
    matches: runde.map((p) => {
      const m = matches.holen(p.matchId)!
      return {
        matchId: m.id,
        spielerA: spielerIn(m, 0),
        spielerB: spielerIn(m, 1),
        status: m.status,
        siegerId: m.siegerId,
        platzUm: p.platzUm,
      }
    }),
  }))

  // Mein Match der aktuellen Runde, solange es noch läuft
  const aktuelle = turnier.runden[turnier.runden.length - 1] ?? []
  const naechstes = aktuelle
    .map((p) => matches.holen(p.matchId)!)
    .find((m) =>
      m.spieler.some((s) => s.id === nutzerId) && m.status !== 'beendet' &&
      m.status !== 'abgebrochen'
    )

  return {
    id: turnier.id,
    serverZeit: jetzt.toISOString(),
    groesse: turnier.groesse,
    schwierigkeit: turnier.schwierigkeit,
    status: turnier.status,
    hostId: turnier.hostId,
    code: istHost ? turnier.code : null,
    codeEndeAm: istHost ? turnier.codeEndeAm?.toISOString() ?? null : null,
    teilnehmer: turnier.teilnehmer.map((t) => ohneAnfragen(t)),
    runden,
    platzierungen: turnier.platzierungen.map((p) => ({
      platz: p.platz,
      spieler: ohneAnfragen(person(p.spielerId)),
    })),
    meinNaechstesMatchId: naechstes?.id ?? null,
  }
}

/** Spieler eines Matches mit seiner Zahl an Anfragen in diesem Match */
function spielerIn(match: MatchIntern, index: number): Spieler {
  const s = match.spieler[index]
  return { id: s.id, name: s.name, istComputer: s.istComputer, anfragen: s.anfragen }
}

/** Teilnehmer außerhalb eines Matches; Anfragen zählen nur pro Match */
function ohneAnfragen(t: TeilnehmerIntern): Spieler {
  return { id: t.id, name: t.name, istComputer: t.istComputer, anfragen: 0 }
}
