import { assert, assertEquals } from '@std/assert'
import type { Schwierigkeit } from '../../shared/types.ts'
import { festerZufall } from '../testHilfen.ts'
import { abstaende } from './erreichbarkeit.ts'
import { alleMauern, labyrinthErzeugen, SCHATZ_AUSWAHL } from './generator.ts'
import { entwurfPruefen, loesbarkeitPruefen } from './regeln.ts'
import { kuerzesteWege, schwererZuerst, wegBewerten } from './wegbewertung.ts'

const SCHWIERIGKEITEN: Schwierigkeit[] = ['einfach', 'standard', 'schwer']
const LAEUFE = 200

Deno.test('alleMauern: 60 verschiedene Innenmauern', () => {
  const mauern = alleMauern()
  assertEquals(mauern.length, 60)
  assertEquals(new Set(mauern).size, 60)
})

for (const schwierigkeit of SCHWIERIGKEITEN) {
  Deno.test(`${schwierigkeit}: jedes Labyrinth hält die Regeln ein und ist lösbar`, () => {
    for (let i = 0; i < LAEUFE; i++) {
      const labyrinth = labyrinthErzeugen(schwierigkeit, festerZufall(i))
      const form = entwurfPruefen(labyrinth)
      assert(form.ok, `Lauf ${i}: ${JSON.stringify(form)}`)
      assertEquals(loesbarkeitPruefen(labyrinth).loesbar, true, `Lauf ${i}`)
      // Der Spannbaum verbindet alle Zellen, Entfernen trennt nichts
      assertEquals(abstaende(labyrinth.mauern).size, 36, `Lauf ${i}`)
    }
  })
}

// 36 Zellen brauchen 35 offene Wege, also bleiben 60 - 35 = 25 Mauern stehen
Deno.test('Mauerzahl passt zur Schwierigkeit', () => {
  const erwartet = { einfach: [10, 15], standard: [19, 21], schwer: [25, 25] }
  for (const schwierigkeit of SCHWIERIGKEITEN) {
    const [min, max] = erwartet[schwierigkeit]
    for (let i = 0; i < LAEUFE; i++) {
      const anzahl = labyrinthErzeugen(schwierigkeit, festerZufall(i)).mauern.length
      assert(anzahl >= min && anzahl <= max, `${schwierigkeit}, Lauf ${i}: ${anzahl} Mauern`)
    }
  }
})

Deno.test('schwer: der Schatz liegt im schwersten Fünftel', () => {
  const plaetze = Math.round(35 * SCHATZ_AUSWAHL.schwer) // 7 Zellen
  for (let i = 0; i < LAEUFE; i++) {
    const { schatz, mauern } = labyrinthErzeugen('schwer', festerZufall(i))
    const bewertungen = new Map(
      [...kuerzesteWege(mauern)].map(([zelle, weg]) => [zelle, wegBewerten(weg, mauern)]),
    )
    const schatzBewertung = bewertungen.get(schatz)!
    // Schwerer als der Schatz dürfen höchstens 6 Zellen sein
    const schwerer = [...bewertungen.values()].filter((b) => schwererZuerst(b, schatzBewertung) < 0)
    assert(schwerer.length < plaetze, `Lauf ${i}: ${schwerer.length} Zellen sind schwerer`)
  }
})

Deno.test('gleicher Startwert ergibt dasselbe Labyrinth', () => {
  assertEquals(
    labyrinthErzeugen('standard', festerZufall(42)),
    labyrinthErzeugen('standard', festerZufall(42)),
  )
})

Deno.test('verschiedene Startwerte ergeben verschiedene Labyrinthe', () => {
  const labyrinthe = new Set<string>()
  for (let i = 0; i < 20; i++) {
    labyrinthe.add(JSON.stringify(labyrinthErzeugen('schwer', festerZufall(i))))
  }
  assertEquals(labyrinthe.size, 20)
})
