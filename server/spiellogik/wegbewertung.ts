import type { Mauer, Zelle } from '../../shared/types.ts'
import { mauerZwischen, nachbarn, zuPosition } from './koordinaten.ts'

/** Wie schwer der Weg zu einer Zelle zu finden ist (ADR-025) */
export type Bewertung = {
  laenge: number // Schritte auf dem Weg
  abbiegungen: number // Richtungswechsel; Mindestzahl der Anfragen ist abbiegungen + 1
  abzweigungen: number // offene Durchgänge, die vom Weg wegführen
}

/** Ein kürzester Weg von der Startzelle zu jeder erreichbaren Zelle (Breitensuche) */
export function kuerzesteWege(mauern: Mauer[], start: Zelle = 'A1'): Map<Zelle, Zelle[]> {
  const gesperrt = new Set(mauern)
  const wege = new Map<Zelle, Zelle[]>([[start, [start]]])
  const warteschlange: Zelle[] = [start]

  while (warteschlange.length > 0) {
    const zelle = warteschlange.shift()!
    for (const nachbar of nachbarn(zelle)) {
      if (wege.has(nachbar)) continue
      if (gesperrt.has(mauerZwischen(zelle, nachbar))) continue
      // Weg des Vorgängers plus ein Schritt
      wege.set(nachbar, [...wege.get(zelle)!, nachbar])
      warteschlange.push(nachbar)
    }
  }

  return wege
}

/** Bewertet einen Weg aus Nachbarzellen im Labyrinth mit diesen Mauern */
export function wegBewerten(weg: Zelle[], mauern: Mauer[]): Bewertung {
  const gesperrt = new Set(mauern)
  let abbiegungen = 0
  let abzweigungen = 0

  for (let i = 0; i < weg.length - 1; i++) {
    // Abbiegung: Die Richtung zur nächsten Zelle unterscheidet sich von der davor
    if (i > 0 && richtung(weg[i - 1], weg[i]) !== richtung(weg[i], weg[i + 1])) abbiegungen++

    // Abzweigung: jeder offene Durchgang außer Herkunft und nächstem Schritt
    const offen = nachbarn(weg[i]).filter((n) => !gesperrt.has(mauerZwischen(weg[i], n)))
    const benutzt = i > 0 ? 2 : 1
    abzweigungen += offen.length - benutzt
  }

  return { laenge: weg.length - 1, abbiegungen, abzweigungen }
}

/** Sortierhilfe: negativ, wenn a schwerer ist als b. Gleichstand entscheidet die Weglänge. */
export function schwererZuerst(a: Bewertung, b: Bewertung): number {
  return wertung(b) - wertung(a) || b.laenge - a.laenge
}

function wertung(b: Bewertung): number {
  return b.abbiegungen + b.abzweigungen
}

/** Richtung eines Schritts als Text, z. B. "0,1" für nach rechts */
function richtung(von: Zelle, nach: Zelle): string {
  const a = zuPosition(von)
  const b = zuPosition(nach)
  return `${b.zeile - a.zeile},${b.spalte - a.spalte}`
}
