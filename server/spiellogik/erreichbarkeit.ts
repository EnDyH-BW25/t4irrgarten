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
      if (besucht.has(nachbar)) continue
      if (gesperrt.has(mauerZwischen(zelle, nachbar))) continue
      besucht.add(nachbar)
      warteschlange.push(nachbar)
    }
  }

  return besucht
}

/** Mauern am Rand des erreichbaren Bereichs: genau eine ihrer beiden Zellen ist erreichbar */
export function problematischeMauern(mauern: Mauer[], erreichbar: Set<Zelle>): Mauer[] {
  return mauern.filter((mauer) => {
    const [a, b] = zellenDerMauer(mauer)
    // Ungleich heißt: eine Seite drin, die andere draußen
    return erreichbar.has(a) !== erreichbar.has(b)
  })
}
