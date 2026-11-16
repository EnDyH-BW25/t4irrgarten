import type {
  AnfrageErgebnis,
  BekannteKarte,
  LabyrinthEntwurf,
  Mauer,
  Spalte,
  Zeile,
  Zelle,
} from '@shared/types.ts'
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

/** Zerlegt 'C4' in Zeile 'C' und Spalte 4 */
function teile(z: Zelle): { zeile: Zeile; spalte: Spalte } {
  return { zeile: z[0] as Zeile, spalte: Number(z[1]) as Spalte }
}

/** Alle Zellen, die eine Anfrage von hier aus erreichen darf: gleiche Zeile oder Spalte, nicht hier */
export function geradeZiele(position: Zelle): Zelle[] {
  const { zeile, spalte } = teile(position)
  const inZeile = SPALTEN.map((s) => zelle(zeile, s))
  const inSpalte = ZEILEN.map((z) => zelle(z, spalte))
  return [...inZeile, ...inSpalte].filter((z) => z !== position)
}

/** Alle Zellen von a bis b auf einer Geraden, beide eingeschlossen */
export function strecke(a: Zelle, b: Zelle): Zelle[] {
  const pa = teile(a)
  const pb = teile(b)
  const zi = ZEILEN.indexOf(pa.zeile)
  const zj = ZEILEN.indexOf(pb.zeile)
  const dz = Math.sign(zj - zi)
  const ds = Math.sign(pb.spalte - pa.spalte)
  const zellen: Zelle[] = [a]
  let i = zi
  let s: number = pa.spalte
  while (i !== zj || s !== pb.spalte) {
    i += dz
    s += ds
    zellen.push(zelle(ZEILEN[i]!, s as Spalte))
  }
  return zellen
}

/**
 * Trägt eine Anfrage in eine Karte ein, wie der Server es auch tut (karte.ts).
 * Der Client braucht das nur, um den Zug des Computers Schritt für Schritt abzuspielen.
 */
export function spurFortschreiben(karte: BekannteKarte, ergebnis: AnfrageErgebnis): BekannteKarte {
  const besucht = new Set([...karte.besuchteZellen, ...strecke(karte.position, ergebnis.position)])
  const mauern =
    ergebnis.mauer && !karte.entdeckteMauern.includes(ergebnis.mauer)
      ? [...karte.entdeckteMauern, ergebnis.mauer]
      : karte.entdeckteMauern
  return { position: ergebnis.position, besuchteZellen: [...besucht], entdeckteMauern: mauern }
}
