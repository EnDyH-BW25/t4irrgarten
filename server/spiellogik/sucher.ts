/**
 * COMPUTER-SUCHER: wie der Computer im fremden Labyrinth sucht
 * Fairness: Der Sucher plant nur mit seiner bekannten Karte, nie mit dem echten Labyrinth.
 * Das echte Labyrinth sieht nur der Schiedsrichter anfrageAuswerten.
 * Alle Schwierigkeiten nutzen dieselbe Strategie. Die Schwierigkeit steckt nur im
 * Labyrinth des Computers (Generator), nicht im Sucher (Phase 3, Schritt 10).
 * Der Server spielt den ganzen Computerzug auf einmal; der Client spielt ihn danach ab.
 */
import type { AnfrageErgebnis, BekannteKarte, Labyrinth, Zelle } from '../../shared/types.ts'
import { anfrageAuswerten } from './anfrage.ts'
import type { Zufall } from './generator.ts'
import { karteFortschreiben } from './karte.ts'
import { mauerZwischen, nachbarn, zuPosition, zuZelle } from './koordinaten.ts'

/** Sicherung gegen endlose Züge; mit der Strategie unten wird sie nie erreicht */
export const MAX_ANFRAGEN_PRO_ZUG = 100

// Oben, rechts, unten, links
const RICHTUNGEN = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const

/**
 * Einfache Strategie. Der Sucher kennt nur seine Karte, nie das Labyrinth.
 * 1. Sieht er in einer Richtung unbesuchte Zellen, fragt er zufällig eine davon bis zum Ende.
 * 2. Sonst läuft er auf bekanntem Gebiet zur nächsten Zelle, von der aus er Neuland sieht.
 * Regel 2 entstand aus einem Bug: Ohne sie pendelte der Sucher endlos in einem bekannten
 * Gang hin und her (gefunden durch einen Test, der ganze Partien spielt).
 */
export function zielWaehlen(karte: BekannteKarte, zufall: Zufall = Math.random): Zelle {
  const mitNeuland = linienMitNeuland(karte, karte.position)
  if (mitNeuland.length > 0) {
    const gewaehlt = mitNeuland[Math.floor(zufall() * mitNeuland.length)]
    return gewaehlt[gewaehlt.length - 1]
  }

  const weg = wegZumNeuland(karte)
  // Kann bei einem lösbaren Labyrinth nicht passieren, solange der Schatz fehlt
  if (!weg) throw new Error(`Von ${karte.position} aus ist kein Neuland erreichbar.`)
  return ersteGerade(weg)
}

/** Ergebnis eines ganzen Computer-Zugs */
export type Zug = { anfragen: AnfrageErgebnis[]; karte: BekannteKarte }

/** Spielt einen ganzen Zug: Anfragen, bis eine Antwort nicht "ja" lautet */
export function computerZug(
  labyrinth: Labyrinth,
  karte: BekannteKarte,
  zufall: Zufall = Math.random,
): Zug {
  const anfragen: AnfrageErgebnis[] = []
  while (anfragen.length < MAX_ANFRAGEN_PRO_ZUG) {
    const ziel = zielWaehlen(karte, zufall)
    // Der Schiedsrichter prüft gegen das echte Labyrinth, der Sucher sieht nur das Ergebnis
    const ergebnis = anfrageAuswerten(karte.position, ziel, labyrinth.mauern, labyrinth.schatz)!
    anfragen.push(ergebnis)
    karte = karteFortschreiben(karte, ergebnis)
    if (ergebnis.ergebnis !== 'ja') break // Spielregel: nur "ja" erlaubt eine weitere Anfrage
  }
  return { anfragen, karte }
}

/** Alle Richtungen ab einer Zelle, in denen vor der nächsten bekannten Mauer Neuland liegt */
function linienMitNeuland(karte: BekannteKarte, start: Zelle): Zelle[][] {
  const besucht = new Set(karte.besuchteZellen)
  return RICHTUNGEN.map(([dz, ds]) => linie(karte, start, dz, ds))
    .filter((l) => l.some((z) => !besucht.has(z)))
}

/** Zellen ab start in eine Richtung, bis zum Rand oder zur nächsten bekannten Mauer */
function linie(karte: BekannteKarte, start: Zelle, dz: number, ds: number): Zelle[] {
  const bekannt = new Set(karte.entdeckteMauern)
  const zellen: Zelle[] = []
  let aktuell = start
  while (true) {
    const p = zuPosition(aktuell)
    const naechste = zuZelle(p.zeile + dz, p.spalte + ds)
    if (!naechste || bekannt.has(mauerZwischen(aktuell, naechste))) return zellen
    zellen.push(naechste)
    aktuell = naechste
  }
}

/** Breitensuche über besuchte Zellen bis zur nächsten Zelle, die Neuland sieht */
function wegZumNeuland(karte: BekannteKarte): Zelle[] | null {
  const besucht = new Set(karte.besuchteZellen)
  const bekannt = new Set(karte.entdeckteMauern)
  const wege = new Map<Zelle, Zelle[]>([[karte.position, [karte.position]]])
  const warteschlange: Zelle[] = [karte.position]

  while (warteschlange.length > 0) {
    const zelle = warteschlange.shift()!
    if (zelle !== karte.position && linienMitNeuland(karte, zelle).length > 0) {
      return wege.get(zelle)!
    }
    for (const nachbar of nachbarn(zelle)) {
      if (wege.has(nachbar) || !besucht.has(nachbar)) continue
      if (bekannt.has(mauerZwischen(zelle, nachbar))) continue
      wege.set(nachbar, [...wege.get(zelle)!, nachbar])
      warteschlange.push(nachbar)
    }
  }
  return null
}

/** Letzte Zelle des ersten geraden Stücks eines Wegs: so weit reicht eine Anfrage */
function ersteGerade(weg: Zelle[]): Zelle {
  const richtung = (a: Zelle, b: Zelle) => {
    const pa = zuPosition(a)
    const pb = zuPosition(b)
    return `${pb.zeile - pa.zeile},${pb.spalte - pa.spalte}`
  }
  let i = 1
  while (i + 1 < weg.length && richtung(weg[i - 1], weg[i]) === richtung(weg[i], weg[i + 1])) i++
  return weg[i]
}
