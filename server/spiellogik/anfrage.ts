/**
 * ANFRAGE AUSWERTEN: der Schiedsrichter des Spiels (Kernregel)
 * Der Spieler fragt "Komme ich von meiner Position gerade bis zum Ziel?". Der Server läuft
 * Feld für Feld los und antwortet mit einem von vier Ergebnissen:
 *   ja              bis zum Ziel gekommen, Figur steht auf dem Ziel
 *   nurBis          unterwegs eine Mauer, Figur steht davor (Mauer wird bekannt)
 *   nein            Mauer direkt vor der Figur, Figur bleibt stehen
 *   schatzGefunden  Schatz unterwegs betreten => Spiel gewonnen, Lauf endet dort
 * Nur "ja" erlaubt eine weitere Anfrage im selben Zug. Alles andere beendet den Zug.
 */
import type { AnfrageErgebnis, Mauer, Zelle } from '../../shared/types.ts'
import { mauerZwischen, type Position, zuPosition, zuZelle } from './koordinaten.ts'

/**
 * Ein Schritt von a in Richtung b, z. B. { zeile: 0, spalte: 1 } für "nach rechts".
 * null, wenn b diagonal zu a liegt oder dieselbe Zelle ist.
 */
function richtung(a: Zelle, b: Zelle): Position | null {
  const pa = zuPosition(a)
  const pb = zuPosition(b)
  const zeile = Math.sign(pb.zeile - pa.zeile) // -1, 0 oder 1
  const spalte = Math.sign(pb.spalte - pa.spalte)
  // Gültig ist nur: genau einer der beiden Werte ist 0
  // beide 0 = dieselbe Zelle, beide ungleich 0 = diagonal => keine gerade Anfrage
  if ((zeile === 0) === (spalte === 0)) return null
  return { zeile, spalte }
}

/**
 * Wertet eine Anfrage aus. null, wenn das Ziel nicht gerade in Zeile oder Spalte liegt.
 * null statt throw: Reine Funktion, erst match/ablauf.ts macht daraus einen 400-Fehler.
 * Beispiel: Figur A1, Ziel A4, Mauer A3_A4 => nurBis, Position A3, Mauer A3_A4
 */
export function anfrageAuswerten(
  position: Zelle,
  ziel: Zelle,
  mauern: Mauer[],
  schatz: Zelle,
): AnfrageErgebnis | null {
  const schritt = richtung(position, ziel)
  if (!schritt) return null

  const gesperrt = new Set(mauern)
  let aktuell = position

  // Feld für Feld Richtung Ziel, bis eine Mauer, der Schatz oder das Ziel kommt
  while (aktuell !== ziel) {
    const p = zuPosition(aktuell)
    const naechste = zuZelle(p.zeile + schritt.zeile, p.spalte + schritt.spalte)
    if (!naechste) return null // Kann nicht passieren, das Ziel liegt im Raster

    // Zuerst die Mauer: Der Schritt auf das nächste Feld muss erlaubt sein
    const mauer = mauerZwischen(aktuell, naechste)
    if (gesperrt.has(mauer)) {
      // Noch kein Schritt gemacht => nein, sonst nurBis
      const ergebnis = aktuell === position ? 'nein' : 'nurBis'
      return { ziel, ergebnis, position: aktuell, mauer }
    }

    // Dann der Schritt und der Blick auf das neue Feld
    aktuell = naechste
    if (aktuell === schatz) {
      return { ziel, ergebnis: 'schatzGefunden', position: aktuell, mauer: null }
    }
  }

  return { ziel, ergebnis: 'ja', position: ziel, mauer: null }
}
