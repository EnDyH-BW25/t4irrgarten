/**
 * REGELN FÜR DEN EIGENEN IRRGARTEN: zwei Prüfungen in zwei Stufen
 * 1. entwurfPruefen: Form (gültige Mauernamen, keine Doppelten, max. 30, Schatz nicht A1).
 *    Verstoß = kaputte Eingabe => 400. Läuft bei jedem PUT /labyrinth.
 * 2. loesbarkeitPruefen: Inhalt (Schatz von A1 erreichbar?). Unlösbar ist kein Fehler,
 *    sondern ein Zwischenstand im Aufbau. Ergebnis geht als "pruefung" an den Client
 *    (grün/rot, markierte Mauern). Erst "Irrgarten setzen" verlangt loesbar = true (422).
 */
import {
  type LabyrinthEntwurf,
  type Mauer,
  MAX_MAUERN,
  type Pruefung,
  type Zelle,
} from '../../shared/types.ts'
import { erreichbareZellen, problematischeMauern } from './erreichbarkeit.ts'
import { istZelle, parseMauer } from './koordinaten.ts'

const START: Zelle = 'A1'

/** Ein Problem in der Eingabe, wie in details der Fehlerantwort */
type Detail = { feld: string; problem: string }

/** Ergebnis der Formprüfung: entweder ein sauberer Entwurf oder alle Probleme */
export type EntwurfErgebnis =
  | { ok: true; entwurf: LabyrinthEntwurf }
  | { ok: false; details: Detail[] }

/** Prüft die Form eines Entwurfs und vereinheitlicht die Mauern. Sammelt alle Probleme. */
export function entwurfPruefen(
  eingabe: { schatz: string | null; mauern: string[] },
): EntwurfErgebnis {
  const details: Detail[] = []
  const mauern: Mauer[] = []

  // entries() liefert Index und Wert, der Index steht im Feldnamen, z. B. "mauern[3]"
  for (const [i, text] of eingabe.mauern.entries()) {
    const mauer = parseMauer(text) // normiert auch: "A2_A1" wird "A1_A2"
    if (!mauer) {
      details.push({
        feld: `mauern[${i}]`,
        problem: `${text} ist keine Mauer zwischen zwei Nachbarzellen.`,
      })
    } else if (mauern.includes(mauer)) {
      details.push({ feld: `mauern[${i}]`, problem: `Die Mauer ${mauer} ist doppelt.` })
    } else {
      mauern.push(mauer)
    }
  }
  if (eingabe.mauern.length > MAX_MAUERN) {
    details.push({ feld: 'mauern', problem: `Höchstens ${MAX_MAUERN} Mauern sind erlaubt.` })
  }

  let schatz: Zelle | null = null
  if (eingabe.schatz !== null) {
    if (!istZelle(eingabe.schatz)) {
      details.push({ feld: 'schatz', problem: `${eingabe.schatz} ist keine Zelle.` })
    } else if (eingabe.schatz === START) {
      details.push({ feld: 'schatz', problem: 'Der Schatz darf nicht auf A1 liegen.' })
    } else {
      schatz = eingabe.schatz
    }
  }

  if (details.length > 0) return { ok: false, details }
  return { ok: true, entwurf: { schatz, mauern } }
}

/** Prüft, ob der Schatz von A1 aus erreichbar ist. Markiert sonst die Mauern am Rand. */
export function loesbarkeitPruefen(entwurf: LabyrinthEntwurf): Pruefung {
  // Drei Zustände: null = noch kein Schatz (grau), true = lösbar (grün), false = unlösbar (rot)
  if (entwurf.schatz === null) {
    return { loesbar: null, meldung: null, problematischeMauern: [] }
  }

  const erreichbar = erreichbareZellen(entwurf.mauern, START)
  if (erreichbar.has(entwurf.schatz)) {
    return { loesbar: true, meldung: 'Schatz erreichbar', problematischeMauern: [] }
  }

  return {
    loesbar: false,
    meldung: 'Schatz nicht erreichbar',
    problematischeMauern: problematischeMauern(entwurf.mauern, erreichbar),
  }
}
