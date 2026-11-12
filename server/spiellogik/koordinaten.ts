import type { Mauer, Spalte, Zeile, Zelle } from '../../shared/types.ts'

// Ein Buchstabe A-F, danach eine Ziffer 1-6, sonst nichts
const ZELLE_MUSTER = /^[A-F][1-6]$/

const ZEILEN: readonly Zeile[] = ['A', 'B', 'C', 'D', 'E', 'F']
const GROESSE = 6

/** Lage einer Zelle als Zahlen, beide ab 0 gezählt */
export type Position = { zeile: number; spalte: number }

/** Prüft, ob ein Text eine gültige Zelle im 6x6-Raster ist, z. B. "C4" */
export function istZelle(text: string): text is Zelle {
  return ZELLE_MUSTER.test(text)
}

// Ganze Zahl von 0 bis 5
function imRaster(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < GROESSE
}

/** Wandelt "C4" in { zeile: 2, spalte: 3 } um */
export function zuPosition(zelle: Zelle): Position {
  return {
    zeile: ZEILEN.indexOf(zelle[0] as Zeile),
    spalte: Number(zelle[1]) - 1,
  }
}

/** Wandelt Zahlen zurück in eine Zelle, außerhalb des Rasters null */
export function zuZelle(zeile: number, spalte: number): Zelle | null {
  if (!imRaster(zeile) || !imRaster(spalte)) return null
  return `${ZEILEN[zeile]}${(spalte + 1) as Spalte}`
}

/** Prüft, ob zwei Zellen waagrecht oder senkrecht nebeneinander liegen */
export function sindNachbarn(a: Zelle, b: Zelle): boolean {
  const pa = zuPosition(a)
  const pb = zuPosition(b)
  const abstand = Math.abs(pa.zeile - pb.zeile) + Math.abs(pa.spalte - pb.spalte)
  return abstand === 1
}

/** Liest eine Mauer wie "A2_A1" und gibt sie vereinheitlicht zurück ("A1_A2"), sonst null */
export function parseMauer(text: string): Mauer | null {
  const teile = text.split('_')
  if (teile.length !== 2) return null
  const [a, b] = teile
  if (!istZelle(a) || !istZelle(b) || !sindNachbarn(a, b)) return null
  // Kleinere Zelle zuerst, damit jede Mauer nur eine Schreibweise hat
  return a < b ? `${a}_${b}` : `${b}_${a}`
}
