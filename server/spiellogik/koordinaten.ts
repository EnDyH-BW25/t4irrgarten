/**
 * KOORDINATEN: Grundbausteine des 6x6-Rasters (unterste Schicht, alle anderen nutzen sie)
 * Zwei Darstellungen einer Zelle:
 *   Text "C4"               für API, JSON und Menschen
 *   Position {zeile: 2, spalte: 3}  zum Rechnen (beide ab 0)
 * Mauer = Text "A1_A2" zwischen zwei Nachbarzellen. Normiert: kleinere Zelle zuerst (ADR-021),
 * damit "A2_A1" und "A1_A2" dieselbe Mauer sind und ein Set sie als gleich erkennt.
 * Außenwände sind keine Mauern, sie gelten immer (zuZelle liefert außerhalb null).
 */
import type { Mauer, Spalte, Zeile, Zelle } from '../../shared/types.ts'

// Ein Buchstabe A-F, danach eine Ziffer 1-6, sonst nichts
const ZELLE_MUSTER = /^[A-F][1-6]$/

const ZEILEN: readonly Zeile[] = ['A', 'B', 'C', 'D', 'E', 'F']
const GROESSE = 6

/** Lage einer Zelle als Zahlen, beide ab 0 gezählt */
export type Position = { zeile: number; spalte: number }

/**
 * Prüft, ob ein Text eine gültige Zelle im 6x6-Raster ist, z. B. "C4"
 * "text is Zelle" = Type Guard: Nach if (istZelle(t)) weiß TypeScript, dass t eine Zelle ist.
 */
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
  // Manhattan-Abstand: Zeilen- plus Spaltenunterschied. Genau 1 = direkt nebeneinander.
  // Diagonal ergäbe 2, dieselbe Zelle 0. Beispiel: A1_F6 wird so abgelehnt.
  const abstand = Math.abs(pa.zeile - pb.zeile) + Math.abs(pa.spalte - pb.spalte)
  return abstand === 1
}

/** Liest eine Mauer wie "A2_A1" und gibt sie vereinheitlicht zurück ("A1_A2"), sonst null */
export function parseMauer(text: string): Mauer | null {
  const teile = text.split('_')
  if (teile.length !== 2) return null
  const [a, b] = teile
  if (!istZelle(a) || !istZelle(b) || !sindNachbarn(a, b)) return null
  return mauerZwischen(a, b)
}

/** Baut die Mauer zwischen zwei Nachbarzellen, egal in welcher Reihenfolge sie kommen */
export function mauerZwischen(a: Zelle, b: Zelle): Mauer {
  // Kleinere Zelle zuerst, damit jede Mauer nur eine Schreibweise hat
  // Textvergleich: "A2" < "B1" (Buchstabe zuerst), "A1" < "A2" (dann Ziffer)
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

/** Zerlegt eine Mauer in ihre beiden Zellen */
export function zellenDerMauer(mauer: Mauer): [Zelle, Zelle] {
  return mauer.split('_') as [Zelle, Zelle]
}

// Ein Schritt in Zeile und Spalte: oben, rechts, unten, links
const RICHTUNGEN = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const

/** Liefert alle Zellen, die waagrecht oder senkrecht an eine Zelle grenzen (Ecke 2, Rand 3, innen 4) */
export function nachbarn(zelle: Zelle): Zelle[] {
  const { zeile, spalte } = zuPosition(zelle)
  const ergebnis: Zelle[] = []
  for (const [dz, ds] of RICHTUNGEN) {
    const nachbar = zuZelle(zeile + dz, spalte + ds)
    if (nachbar) ergebnis.push(nachbar)
  }
  return ergebnis
}
