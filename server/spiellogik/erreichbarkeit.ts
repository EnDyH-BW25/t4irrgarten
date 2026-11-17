/**
 * ERREICHBARKEIT: Ist der Schatz von A1 aus erreichbar? (Grundlage der Live-Prüfung, ADR-007)
 * Algorithmus: Breitensuche (BFS). Das Labyrinth ist ein Graph: Zellen = Knoten,
 * offene Durchgänge = Kanten. Die Suche färbt von A1 aus Schicht für Schicht alles ein,
 * was ohne Mauer erreichbar ist. Liegt der Schatz außerhalb, ist das Labyrinth unlösbar.
 * Aufwand: jede der 36 Zellen höchstens einmal => sehr schnell, darum bei jedem Klick möglich.
 */
import type { Mauer, Zelle } from '../../shared/types.ts'
import { mauerZwischen, nachbarn, zellenDerMauer } from './koordinaten.ts'

/** Alle Zellen, die von der Startzelle aus ohne Mauer erreichbar sind (Breitensuche) */
export function erreichbareZellen(mauern: Mauer[], start: Zelle = 'A1'): Set<Zelle> {
  const gesperrt = new Set(mauern)
  const besucht = new Set<Zelle>([start])
  const warteschlange: Zelle[] = [start]

  while (warteschlange.length > 0) {
    // Vorne herausnehmen, hinten anfügen: so wächst der Bereich Schritt für Schritt
    const zelle = warteschlange.shift()!
    for (const nachbar of nachbarn(zelle)) {
      if (besucht.has(nachbar)) continue // schon gefunden: nicht doppelt besuchen
      if (gesperrt.has(mauerZwischen(zelle, nachbar))) continue // Mauer dazwischen
      besucht.add(nachbar)
      warteschlange.push(nachbar)
    }
  }

  return besucht
}

/** Kürzeste Schrittzahl von der Startzelle zu jeder erreichbaren Zelle (Breitensuche) */
export function abstaende(mauern: Mauer[], start: Zelle = 'A1'): Map<Zelle, number> {
  const gesperrt = new Set(mauern)
  const abstand = new Map<Zelle, number>([[start, 0]])
  const warteschlange: Zelle[] = [start]

  while (warteschlange.length > 0) {
    const zelle = warteschlange.shift()!
    for (const nachbar of nachbarn(zelle)) {
      if (abstand.has(nachbar)) continue
      if (gesperrt.has(mauerZwischen(zelle, nachbar))) continue
      // Die Breitensuche erreicht jede Zelle zuerst auf dem kürzesten Weg
      abstand.set(nachbar, abstand.get(zelle)! + 1)
      warteschlange.push(nachbar)
    }
  }

  return abstand
}

/**
 * Mauern am Rand des erreichbaren Bereichs: genau eine ihrer beiden Zellen ist erreichbar
 * Das sind die rot markierten Mauern im Client. Öffnet man eine davon, wächst der Bereich.
 * Mauern ganz innen oder ganz außen sind nicht schuld und bleiben unmarkiert.
 */
export function problematischeMauern(mauern: Mauer[], erreichbar: Set<Zelle>): Mauer[] {
  return mauern.filter((mauer) => {
    const [a, b] = zellenDerMauer(mauer)
    // Ungleich heißt: eine Seite drin, die andere draußen
    return erreichbar.has(a) !== erreichbar.has(b)
  })
}
