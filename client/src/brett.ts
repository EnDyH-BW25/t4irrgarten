/**
 * SPIELBRETT-LOGIK im Client (reine Funktionen, ohne Vue, getestet in brett.spec.ts)
 * Das Brett hat 6x6 Zellen: Zeilen A-F, Spalten 1-6, Zellnamen wie 'C4'.
 * Zwei Aufgaben:
 * 1. Aufbau: Mauern umschalten und Schatz setzen (nur Entwurf, der Server prüft danach)
 * 2. Spielphase: klickbare Ziele berechnen und den Computerzug Schritt für Schritt nachspielen
 * Wichtig: Der Server bleibt die Wahrheit. Der Client rechnet nur für die Anzeige vor.
 */
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
 * Warum unveränderlich (immutable)? SpielView kann so den alten Stand behalten und
 * bei einem Speicherfehler zurückspringen. Vue erkennt das neue Objekt sicher als Änderung.
 */
export function mauerUmschalten(entwurf: LabyrinthEntwurf, mauer: Mauer): LabyrinthEntwurf | null {
  // Fall 1: Die Mauer steht schon. Dann entfernen.
  if (entwurf.mauern.includes(mauer)) {
    // { ...entwurf } kopiert alle Felder, mauern wird mit der gefilterten Liste überschrieben
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
  // "as" sagt TypeScript: Ich weiß, dass hier nur gültige Werte stehen (Typumwandlung ohne Prüfung)
  return { zeile: z[0] as Zeile, spalte: Number(z[1]) as Spalte }
}

/**
 * Alle Zellen, die eine Anfrage von hier aus erreichen darf: gleiche Zeile oder Spalte, nicht hier
 * Regel: Eine Anfrage geht immer gerade (waagerecht oder senkrecht). Beispiel C4:
 * C1..C6 und A4..F4 ohne C4 => 10 klickbare Zellen in LabyrinthFeld.
 */
export function geradeZiele(position: Zelle): Zelle[] {
  const { zeile, spalte } = teile(position)
  const inZeile = SPALTEN.map((s) => zelle(zeile, s))
  const inSpalte = ZEILEN.map((z) => zelle(z, spalte))
  return [...inZeile, ...inSpalte].filter((z) => z !== position)
}

/**
 * Alle Zellen von a bis b auf einer Geraden, beide eingeschlossen
 * Beispiel: strecke('A1', 'A4') => ['A1', 'A2', 'A3', 'A4']
 * Math.sign liefert die Richtung: -1, 0 oder +1. So läuft eine Schleife in alle vier Richtungen.
 */
export function strecke(a: Zelle, b: Zelle): Zelle[] {
  const pa = teile(a)
  const pb = teile(b)
  const zi = ZEILEN.indexOf(pa.zeile) // Zeile als Zahl 0-5, damit man rechnen kann
  const zj = ZEILEN.indexOf(pb.zeile)
  const dz = Math.sign(zj - zi) // Schritt in Zeilenrichtung
  const ds = Math.sign(pb.spalte - pa.spalte) // Schritt in Spaltenrichtung
  const zellen: Zelle[] = [a]
  let i = zi
  let s: number = pa.spalte
  // Schritt für Schritt laufen, bis das Ziel erreicht ist
  while (i !== zj || s !== pb.spalte) {
    i += dz
    s += ds
    zellen.push(zelle(ZEILEN[i]!, s as Spalte)) // ! = "ist sicher nicht undefined"
  }
  return zellen
}

/**
 * Trägt eine Anfrage in eine Karte ein, wie der Server es auch tut (karte.ts).
 * Der Client braucht das nur, um den Zug des Computers Schritt für Schritt abzuspielen.
 * Hintergrund: Der Server liefert den ganzen Computerzug auf einmal (computerAnfragen).
 * Der Client spielt die Anfragen nacheinander ab und baut die Spur dabei selbst auf.
 */
export function spurFortschreiben(karte: BekannteKarte, ergebnis: AnfrageErgebnis): BekannteKarte {
  // Set entfernt doppelte Zellen automatisch (Zellen, die schon besucht waren)
  const besucht = new Set([...karte.besuchteZellen, ...strecke(karte.position, ergebnis.position)])
  // Neue Mauer nur anhängen, wenn es eine gibt und sie noch nicht bekannt ist
  const mauern =
    ergebnis.mauer && !karte.entdeckteMauern.includes(ergebnis.mauer)
      ? [...karte.entdeckteMauern, ergebnis.mauer]
      : karte.entdeckteMauern
  return { position: ergebnis.position, besuchteZellen: [...besucht], entdeckteMauern: mauern }
}
