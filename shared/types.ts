// Zeilen von oben nach unten:
export type Zeile = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

// Spalten von links nach rechts:
export type Spalte = 1 | 2 | 3 | 4 | 5 | 6

/** Eine Zelle im 6x6-Raster */
export type Zelle = `${Zeile}${Spalte}`

/** Eine Mauer zwischen zwei Zellen */
export type Mauer = `${Zelle}_${Zelle}`

/** Gesetztes Labyrinth mit festgelegtem Schatz und Mauern */
export type Labyrinth = {
  schatz: Zelle
  mauern: Mauer[]
}

/** Entwurf eines Labyrinths in der Aufbau-Phase; der Schatz darf noch fehlen */
export type LabyrinthEntwurf = {
  schatz: Zelle | null
  mauern: Mauer[]
}

export type MatchStatus = 'wartet' | 'aufbau' | 'startbereit' | 'laeuft' | 'beendet' | 'abgebrochen'

/* export type Fehler = {
    
}
*/
