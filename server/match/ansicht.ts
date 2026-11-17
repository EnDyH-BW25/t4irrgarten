import type { Bereitschaft, Match } from '../../shared/types.ts'
import { loesbarkeitPruefen } from '../spiellogik/regeln.ts'
import { gesetztesLabyrinth, teilnehmer } from './ablauf.ts'
import type { MatchIntern, SpielerDaten } from './typen.ts'

/** Bereitschaft eines Spielers: gesetzt, bestätigt und Ende der Nachbesserung */
function bereitschaft(s: SpielerDaten): Bereitschaft {
  return {
    labyrinthGesetzt: s.gesetzt,
    startBestaetigt: s.startBestaetigt,
    nachbesserungEndeAm: s.nachbesserungEndeAm?.toISOString() ?? null,
  }
}

/**
 * Sicht eines Spielers auf das Match. Jedes Feld steht einzeln da, damit nichts Geheimes
 * mitrutscht. Das Labyrinth des Gegners gibt es erst nach Spielende.
 */
export function ansichtFuer(match: MatchIntern, nutzerId: string, jetzt: Date): Match {
  const { ich, gegner } = teilnehmer(match, nutzerId)

  return {
    id: match.id,
    version: match.version,
    serverZeit: jetzt.toISOString(),
    modus: match.modus,
    schwierigkeit: match.schwierigkeit,
    status: match.status,
    // Im Status wartet ist nur der Ersteller Teilnehmer. Nur er sieht den Code.
    code: match.code,
    codeEndeAm: match.codeEndeAm?.toISOString() ?? null,
    competitionId: match.competitionId,
    spieler: match.spieler.map((s) => ({
      id: s.id,
      name: s.name,
      istComputer: s.istComputer,
      anfragen: s.anfragen,
    })),
    amZug: match.amZug,
    anfrageNr: match.anfrageNr,
    aufbauEndeAm: match.aufbauEndeAm?.toISOString() ?? null,
    startFristEndeAm: match.startFristEndeAm?.toISOString() ?? null,
    zugEndeAm: match.zugEndeAm?.toISOString() ?? null,

    // Bereitschaft
    ich: bereitschaft(ich),
    gegner: gegner ? bereitschaft(gegner) : null,

    // Labyrinth und Karten
    pruefung: match.status === 'aufbau' ? loesbarkeitPruefen(ich.entwurf) : null,
    meinLabyrinth: ich.entwurf,
    bekannteKarte: ich.karte,
    gegnerKarte: gegner?.karte ?? null,
    // Live-Sicht: Die Anfragen des Gegners verraten nur, was er schon über mein Labyrinth weiß
    gegnerAnfragen: gegner?.verlauf ?? null,

    // Ende
    siegerId: match.siegerId,
    endegrund: match.endegrund,
    // Wer im Aufbau aufgibt oder kampflos verliert, hat kein gesetztes Labyrinth
    gegnerLabyrinth: match.status === 'beendet' && gegner?.gesetzt
      ? gesetztesLabyrinth(gegner)
      : null,
  }
}
