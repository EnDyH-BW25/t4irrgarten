import type { Mauer, Zelle } from '../../shared/types.ts'
import { mauerZwischen, nachbarn } from './koordinaten.ts'

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
