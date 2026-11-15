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
  const anzahl = Math.round(baum.length * (min + zufall() * (max - min)))
  const mauern = mischen(baum, zufall).slice(anzahl)

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

/** Spannbaum per zufälliger Tiefensuche. Liefert die Mauern, die stehen bleiben. */
function spannbaumMauern(zufall: Zufall): Mauer[] {
  const offen = new Set<Mauer>()
  const besucht = new Set<Zelle>([START])
  const stapel: Zelle[] = [START]

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

/** Mischt eine Kopie der Liste (Fisher-Yates) */
function mischen<T>(liste: T[], zufall: Zufall): T[] {
  const kopie = [...liste]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}
