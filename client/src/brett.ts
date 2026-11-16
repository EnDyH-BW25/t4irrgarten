import type { LabyrinthEntwurf, Mauer, Spalte, Zeile, Zelle } from '@shared/types.ts'
import { MAX_MAUERN } from '@shared/types.ts'

/** Zeilen von oben nach unten und Spalten von links nach rechts, in Zeichenreihenfolge */
export const ZEILEN: Zeile[] = ['A', 'B', 'C', 'D', 'E', 'F']
export const SPALTEN: Spalte[] = [1, 2, 3, 4, 5, 6]

/** Baut den Namen einer Zelle, zum Beispiel zelle('C', 4) ergibt 'C4'. */
export function zelle(zeile: Zeile, spalte: Spalte): Zelle {
  return `${zeile}${spalte}`
}

/**
 * Setzt eine Mauer oder entfernt sie wieder.
 * Liefert einen neuen Entwurf. Den alten verändert die Funktion nicht.
 * Liefert null, wenn schon MAX_MAUERN Mauern stehen und eine neue dazukäme.
 */
export function mauerUmschalten(entwurf: LabyrinthEntwurf, mauer: Mauer): LabyrinthEntwurf | null {
  // Fall 1: Die Mauer steht schon. Dann entfernen.
  if (entwurf.mauern.includes(mauer)) {
    return { ...entwurf, mauern: entwurf.mauern.filter((m) => m !== mauer) }
  }
  // Fall 2: Die Mauer fehlt, aber das Limit ist erreicht.
  if (entwurf.mauern.length >= MAX_MAUERN) return null
  // Fall 3: Die Mauer fehlt. Dann anhängen.
  return { ...entwurf, mauern: [...entwurf.mauern, mauer] }
}

/**
 * Legt den Schatz auf eine Zelle. Liegt er schon woanders, wandert er dorthin.
 * Liefert null für A1, denn dort startet der Gegner.
 */
export function schatzSetzen(entwurf: LabyrinthEntwurf, ziel: Zelle): LabyrinthEntwurf | null {
  if (ziel === 'A1') return null
  return { ...entwurf, schatz: ziel }
}
