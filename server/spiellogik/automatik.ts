import type { Mauer, Zelle } from '../../shared/types.ts'
import { erreichbareZellen } from './erreichbarkeit.ts'
import type { Zufall } from './generator.ts'

/** Wählt zufällig eine von A1 erreichbare Zelle außer A1. Ist nur A1 erreichbar, liefert sie null. */
export function zufaelligerSchatz(mauern: Mauer[], zufall: Zufall): Zelle | null {
  const kandidaten = [...erreichbareZellen(mauern)].filter((zelle) => zelle !== 'A1')
  if (kandidaten.length === 0) return null
  return kandidaten[Math.floor(zufall() * kandidaten.length)]
}
