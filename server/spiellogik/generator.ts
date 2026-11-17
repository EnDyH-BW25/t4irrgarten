/**
 * GENERATOR: baut das Labyrinth des Computers (ADR-004, ADR-025)
 * Drei Schritte:
 * 1. Spannbaum per zufälliger Tiefensuche: ein "perfektes" Labyrinth, in dem jede Zelle
 *    erreichbar ist und es genau einen Weg zwischen zwei Zellen gibt. 36 Zellen brauchen
 *    35 offene Durchgänge, von 60 Mauern bleiben also 25 stehen.
 * 2. Braiding: je nach Schwierigkeit einen Teil der Mauern wieder entfernen. Mehr Öffnungen
 *    = mehr Wege zum Schatz = leichter. Schwer entfernt nichts.
 * 3. Schatz wählen: Zellen nach Schwierigkeit des Wegs sortieren und aus den schwersten losen.
 * Lösbar ist das Ergebnis immer, denn Mauern entfernen macht nichts unerreichbar.
 * zufall als Parameter: Tests geben einen festen Zufall hinein und bekommen immer dasselbe.
 */
import type { Labyrinth, Mauer, Schwierigkeit, Zelle } from '../../shared/types.ts'
import { mauerZwischen, nachbarn, zuZelle } from './koordinaten.ts'
import { kuerzesteWege, schwererZuerst, wegBewerten } from './wegbewertung.ts'

/** Liefert eine Zahl von 0 bis unter 1, genau wie Math.random */
export type Zufall = () => number

const START: Zelle = 'A1'

/** Anteil der Mauern, die nach dem Spannbaum wieder fallen (ADR-004) */
const ENTFERNEN: Record<Schwierigkeit, { min: number; max: number }> = {
  einfach: { min: 0.4, max: 0.6 },
  standard: { min: 0.15, max: 0.25 },
  schwer: { min: 0, max: 0 },
}

/** Anteil der am schwersten erreichbaren Zellen, aus denen der Schatz gelost wird (ADR-025) */
export const SCHATZ_AUSWAHL: Record<Schwierigkeit, number> = {
  einfach: 1, // alle Zellen außer A1
  standard: 0.5, // die schwerere Hälfte
  schwer: 0.2, // das schwerste Fünftel
}

/** Erzeugt ein lösbares Labyrinth für den Computer */
export function labyrinthErzeugen(
  schwierigkeit: Schwierigkeit,
  zufall: Zufall = Math.random,
): Labyrinth {
  const baum = spannbaumMauern(zufall)

  // Braiding: einen zufälligen Teil der Mauern wieder entfernen
  const { min, max } = ENTFERNEN[schwierigkeit]
  // Beispiel einfach: 25 Mauern x 40-60 % => 10 bis 15 Mauern fallen weg
  const anzahl = Math.round(baum.length * (min + zufall() * (max - min)))
  const mauern = mischen(baum, zufall).slice(anzahl) // mischen, dann die ersten "anzahl" weglassen

  const schatz = schatzWaehlen(mauern, schwierigkeit, zufall)
  return { schatz, mauern }
}

/** Alle 60 Innenmauern des Rasters, jede genau einmal */
export function alleMauern(): Mauer[] {
  const mauern: Mauer[] = []
  for (const zelle of alleZellen()) {
    for (const nachbar of nachbarn(zelle)) {
      // Jedes Paar nur aus einer Richtung aufnehmen
      if (zelle < nachbar) mauern.push(mauerZwischen(zelle, nachbar))
    }
  }
  return mauern
}

/**
 * Spannbaum per zufälliger Tiefensuche. Liefert die Mauern, die stehen bleiben.
 * Bild: Ein Maulwurf gräbt von A1 aus zufällig in unbesuchte Nachbarzellen. Kommt er nicht
 * weiter (Sackgasse), geht er auf dem Stapel zurück, bis er wieder Neuland findet.
 * Jeder Durchbruch öffnet eine Mauer. Am Ende ist jede Zelle genau einmal angegraben.
 */
function spannbaumMauern(zufall: Zufall): Mauer[] {
  const offen = new Set<Mauer>()
  const besucht = new Set<Zelle>([START])
  const stapel: Zelle[] = [START] // Stapel (LIFO) = Tiefensuche; Warteschlange (FIFO) wäre Breitensuche

  while (stapel.length > 0) {
    const zelle = stapel[stapel.length - 1]
    const neue = nachbarn(zelle).filter((n) => !besucht.has(n))
    if (neue.length === 0) {
      // Sackgasse: einen Schritt zurück
      stapel.pop()
      continue
    }
    const nachbar = zufaelligesElement(neue, zufall)
    offen.add(mauerZwischen(zelle, nachbar))
    besucht.add(nachbar)
    stapel.push(nachbar)
  }

  return alleMauern().filter((m) => !offen.has(m))
}

/** Lost den Schatz aus den am schwersten erreichbaren Zellen (ADR-025) */
function schatzWaehlen(mauern: Mauer[], schwierigkeit: Schwierigkeit, zufall: Zufall): Zelle {
  // Kette: alle Wege ab A1 -> ohne A1 -> bewerten -> schwerste zuerst -> vorderen Anteil losen
  const kandidaten = [...kuerzesteWege(mauern, START)]
    .filter(([zelle]) => zelle !== START)
    .map(([zelle, weg]) => ({ zelle, bewertung: wegBewerten(weg, mauern) }))
    .sort((a, b) => schwererZuerst(a.bewertung, b.bewertung))
  const anzahl = Math.max(1, Math.round(kandidaten.length * SCHATZ_AUSWAHL[schwierigkeit]))
  return zufaelligesElement(kandidaten.slice(0, anzahl), zufall).zelle
}

function alleZellen(): Zelle[] {
  const zellen: Zelle[] = []
  for (let zeile = 0; zeile < 6; zeile++) {
    for (let spalte = 0; spalte < 6; spalte++) zellen.push(zuZelle(zeile, spalte)!)
  }
  return zellen
}

function zufaelligesElement<T>(liste: T[], zufall: Zufall): T {
  return liste[Math.floor(zufall() * liste.length)]
}

/**
 * Mischt eine Kopie der Liste (Fisher-Yates)
 * Von hinten nach vorn: Element i tauscht mit einem zufälligen Element davor (oder sich selbst).
 * Jede Reihenfolge ist gleich wahrscheinlich. Das Semikolon vor [ verhindert, dass JavaScript
 * die Zeile mit der vorigen verbindet (ohne Semikolon-Stil nötig).
 */
function mischen<T>(liste: T[], zufall: Zufall): T[] {
  const kopie = [...liste]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}
