import type { AnfrageErgebnis, BekannteKarte, Zelle } from '../../shared/types.ts'
import { zuPosition, zuZelle } from './koordinaten.ts'

/** Karte zu Spielbeginn: Die Figur steht auf A1, sonst ist nichts bekannt */
export function neueKarte(): BekannteKarte {
  return { position: 'A1', besuchteZellen: ['A1'], entdeckteMauern: [] }
}

/** Trägt das Ergebnis einer Anfrage in die Karte ein. Ändert die alte Karte nicht. */
export function karteFortschreiben(karte: BekannteKarte, ergebnis: AnfrageErgebnis): BekannteKarte {
  const besucht = new Set(karte.besuchteZellen)
  for (const zelle of strecke(karte.position, ergebnis.position)) besucht.add(zelle)

  const mauern = [...karte.entdeckteMauern]
  if (ergebnis.mauer && !mauern.includes(ergebnis.mauer)) mauern.push(ergebnis.mauer)

  return { position: ergebnis.position, besuchteZellen: [...besucht], entdeckteMauern: mauern }
}

/** Alle Zellen von a bis b auf einer geraden Linie, beide eingeschlossen */
function strecke(a: Zelle, b: Zelle): Zelle[] {
  const pa = zuPosition(a)
  const pb = zuPosition(b)
  const dz = Math.sign(pb.zeile - pa.zeile)
  const ds = Math.sign(pb.spalte - pa.spalte)
  const zellen: Zelle[] = [a]
  let { zeile, spalte } = pa
  while (zeile !== pb.zeile || spalte !== pb.spalte) {
    zeile += dz
    spalte += ds
    zellen.push(zuZelle(zeile, spalte)!)
  }
  return zellen
}
