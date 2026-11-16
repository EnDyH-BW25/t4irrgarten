import type { Labyrinth, LabyrinthEntwurf, Mauer, Zelle } from '../../shared/types.ts'
import { erreichbareZellen, problematischeMauern } from './erreichbarkeit.ts'
import type { Zufall } from './generator.ts'

/** Wählt zufällig eine von A1 erreichbare Zelle außer A1. Ist nur A1 erreichbar, liefert sie null. */
export function zufaelligerSchatz(mauern: Mauer[], zufall: Zufall): Zelle | null {
  const kandidaten = [...erreichbareZellen(mauern)].filter((zelle) => zelle !== 'A1')
  if (kandidaten.length === 0) return null
  return kandidaten[Math.floor(zufall() * kandidaten.length)]
}

/**
 * Macht aus jedem Entwurf ein gültiges Labyrinth, wenn der Spieler es nicht selbst schafft.
 * Fehlt der Schatz, legt sie ihn zufällig. Ist er nicht erreichbar, öffnet sie zufällig
 * markierte Mauern, bis er es ist. Ein lösbarer Entwurf bleibt unverändert.
 */
export function labyrinthVervollstaendigen(entwurf: LabyrinthEntwurf, zufall: Zufall): Labyrinth {
  let mauern = [...entwurf.mauern]
  let schatz = entwurf.schatz

  // Ohne Schatz: zufällige erreichbare Zelle. Ist A1 eingemauert, erst eine Mauer öffnen.
  while (schatz === null) {
    schatz = zufaelligerSchatz(mauern, zufall)
    if (schatz === null) mauern = mauerOeffnen(mauern, zufall)
  }
  // Schatz unerreichbar: so lange öffnen, bis der Weg frei ist
  while (!erreichbareZellen(mauern).has(schatz)) mauern = mauerOeffnen(mauern, zufall)

  return { schatz, mauern }
}

/**
 * Entfernt zufällig eine Mauer am Rand des erreichbaren Bereichs. Jede Öffnung vergrößert den
 * Bereich um mindestens eine Zelle. Die Schleifen oben enden deshalb sicher.
 */
function mauerOeffnen(mauern: Mauer[], zufall: Zufall): Mauer[] {
  const markiert = problematischeMauern(mauern, erreichbareZellen(mauern))
  const weg = markiert[Math.floor(zufall() * markiert.length)]
  return mauern.filter((mauer) => mauer !== weg)
}
