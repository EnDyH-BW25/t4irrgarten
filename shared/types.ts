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

/** Maschinenlesbare Fehlercodes aus der openapi.yaml */
export type FehlerCode =
  | 'VALIDIERUNG'
  | 'NICHT_ANGEMELDET'
  | 'VERBOTEN'
  | 'NICHT_GEFUNDEN'
  | 'KONFLIKT'
  | 'CODE_UNGUELTIG'
  | 'AUFBAU_BEENDET'
  | 'SCHATZ_FEHLT'
  | 'LABYRINTH_UNLOESBAR'
  | 'NICHT_AM_ZUG'
  | 'ZIEL_NICHT_GERADE'
  | 'COMPETITION_VOLL'
  | 'ZU_WENIG_SPIELER'
  | 'INTERN'

/** Antwort des Servers bei jedem Fehler */
export type Fehler = {
  fehler: {
    code: FehlerCode
    nachricht: string
    details?: { feld: string; problem: string }[]
    problematischeMauern?: Mauer[]
  }
}

/** Antwort des Servers auf eine Anfrage */
export type Antwort = 'ja' | 'nurBis' | 'nein' | 'schatzGefunden'

/** Ergebnis einer Anfrage */
export type AnfrageErgebnis = {
  ziel: Zelle
  ergebnis: Antwort
  position: Zelle // Position nach der Anfrage
  mauer: Mauer | null // entdeckte Mauer bei nurBis und nein, sonst null
}
