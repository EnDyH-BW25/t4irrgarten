import type { Endegrund } from '../../shared/types.ts'
import { abbrechen, beenden } from './ablauf.ts'
import { ABRUF_FRIST_MS } from './fristen.ts'
import type { MatchIntern } from './typen.ts'

/**
 * Trägt alle abgelaufenen Fristen nach. Der Server hat keinen Timer. Jeder Zugriff auf ein Match
 * ruft diese Funktion zuerst auf. Gibt true zurück, wenn sich das Match geändert hat.
 *
 * Jede Folge zählt ab dem Fristende, nicht ab jetzt. Ruft lange niemand ab, stimmen so auch
 * Ketten von Fristen: Aufbau vorbei, danach Startfrist vorbei.
 */
export function fristenPruefen(match: MatchIntern, jetzt: Date): boolean {
  const vorher = match.version
  // Reihenfolge wie im Spielablauf. Jede Prüfung kann den Status für die nächste ändern.
  if (match.status === 'startbereit') startfristPruefen(match, jetzt)
  if (match.status === 'laeuft') spielfristenPruefen(match, jetzt)
  return match.version !== vorher
}

/** Jeder Zugriff eines Spielers gilt als Lebenszeichen. Erst nach fristenPruefen aufrufen. */
export function abrufMerken(match: MatchIntern, nutzerId: string, jetzt: Date): void {
  const spieler = match.spieler.find((s) => s.id === nutzerId)
  // Kein version++: Ein Lebenszeichen ändert nichts, was der Client sieht. Sonst gäbe es nie 304.
  if (spieler) spieler.letzterAbrufAm = jetzt
}

/** Bereitschaft: Wer bestätigt hat, gewinnt. Hat keiner bestätigt, bricht das Match ab. */
function startfristPruefen(match: MatchIntern, jetzt: Date): void {
  if (jetzt.getTime() < match.startFristEndeAm!.getTime()) return

  const bereit = match.spieler.filter((s) => s.startBestaetigt)
  // Haben alle bestätigt, liefe das Spiel schon. Es bleiben also ein oder kein Spieler.
  if (bereit.length === 1) beenden(match, bereit[0].id, 'startfrist')
  else abbrechen(match)
  match.version++
}

type Verstoss = { verliererId: string; grund: Endegrund; am: number }

/** Spiel: Zugfrist des Spielers am Zug und Abruffrist jedes Menschen. Der früheste Verstoß zählt. */
function spielfristenPruefen(match: MatchIntern, jetzt: Date): void {
  const verstoesse: Verstoss[] = [
    { verliererId: match.amZug!, grund: 'zugfrist', am: match.zugEndeAm!.getTime() },
  ]
  for (const s of match.spieler) {
    // Der Computer ruft nie ab und gilt nie als abwesend
    if (s.istComputer) continue
    const am = s.letzterAbrufAm.getTime() + ABRUF_FRIST_MS
    verstoesse.push({ verliererId: s.id, grund: 'abwesenheit', am })
  }

  const erster = verstoesse
    .filter((v) => v.am <= jetzt.getTime())
    .sort((a, b) => a.am - b.am)[0]
  if (!erster) return

  const sieger = match.spieler.find((s) => s.id !== erster.verliererId)!
  beenden(match, sieger.id, erster.grund)
  match.version++
}
