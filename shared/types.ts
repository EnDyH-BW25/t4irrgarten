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

/** Ergebnis der Lösbarkeitsprüfung für den eigenen Entwurf */
export type Pruefung = {
  loesbar: boolean | null // null solange noch kein Schatz liegt
  meldung: string | null
  problematischeMauern: Mauer[]
}

/** Angemeldeter Nutzer, wie ihn der Client sieht (User in der openapi.yaml) */
export type Nutzer = {
  id: string
  name: string
  schwierigkeit: Schwierigkeit // zuletzt gegen den Computer gespielt, vorgewählt im Dashboard
}

/** Schwierigkeit des Computer-Labyrinths; wirkt nur im Modus computer */
export type Schwierigkeit = 'einfach' | 'standard' | 'schwer'

/** Spielmodus; ein Turnier-Match ist ein Duell mit gesetzter competitionId */
export type Modus = 'computer' | 'duell'

/** Teilnehmer eines Matches */
export type Spieler = {
  id: string
  name: string
  istComputer: boolean
  anfragen: number // Zahl der gestellten Anfragen, die Endansicht zeigt sie für beide
}

/** Fortschritt eines Spielers in Aufbau und Start; enthält nie das Labyrinth */
export type Bereitschaft = {
  labyrinthGesetzt: boolean
  startBestaetigt: boolean
  nachbesserungEndeAm: string | null // Ende der Nachbesserungsminute, sonst null
}

/** Was ein Spieler über das Labyrinth des Gegners weiß; startet mit A1 */
export type BekannteKarte = {
  position: Zelle
  besuchteZellen: Zelle[]
  entdeckteMauern: Mauer[]
}

/** Grund für das Ende eines Matches */
export type Endegrund =
  | 'schatz'
  | 'aufgabe'
  | 'abwesenheit'
  | 'zugfrist'
  | 'startfrist'
  | 'walkover'

/** Stand eines Matches aus Sicht des anfragenden Spielers; der Server schickt immer alle Felder */
export type Match = {
  id: string
  version: number // steigt bei jeder Änderung, Grundlage für since und 304
  serverZeit: string // Uhrzeit des Servers, Basis für alle Restzeiten
  modus: Modus
  schwierigkeit: Schwierigkeit | null // nur im Modus computer gesetzt
  status: MatchStatus
  code: string | null // Spielcode, nur für den Ersteller im Status wartet
  codeEndeAm: string | null // Ende der Gültigkeit des Codes, nur für den Ersteller im Status wartet
  competitionId: string | null // nur bei Matches eines Turniers gesetzt

  spieler: Spieler[]
  amZug: string | null // Id des Spielers, der Anfragen stellen darf; im Aufbau niemand
  anfrageNr: number // Nummer der nächsten erwarteten Anfrage, beginnt bei 1

  aufbauEndeAm: string | null // nur im Status aufbau gesetzt
  startFristEndeAm: string | null // nur im Status startbereit gesetzt
  zugEndeAm: string | null // nur im Status laeuft gesetzt, gilt für den Spieler in amZug

  ich: Bereitschaft
  gegner: Bereitschaft | null // fehlt im Status wartet
  pruefung: Pruefung | null // nur im Status aufbau gesetzt
  meinLabyrinth: LabyrinthEntwurf | null // fehlt im Status wartet
  bekannteKarte: BekannteKarte // meine Suche im Labyrinth des Gegners
  gegnerKarte: BekannteKarte | null // Suche des Gegners in meinem Labyrinth; fehlt im Status wartet
  gegnerAnfragen: AnfrageErgebnis[] | null // alle Anfragen des Gegners, älteste zuerst; fehlt im Status wartet
  siegerId: string | null // erst nach Spielende gesetzt
  endegrund: Endegrund | null // erst nach Spielende gesetzt
  gegnerLabyrinth: Labyrinth | null // erst nach Spielende gesetzt
}

/** Anfrage zum Anlegen eines Matches; die Schwierigkeit gibt es nur im Modus computer */
export type MatchAnlegen = { modus: 'computer'; schwierigkeit: Schwierigkeit } | { modus: 'duell' }

/** Eingabe einer Anfrage (QueryRequest in der openapi.yaml) */
export type AnfrageEingabe = {
  anfrageNr: number // schützt vor Doppelklick und erneutem Senden
  ziel: Zelle
}

/** Antwort auf eine Anfrage (QueryResponse in der openapi.yaml) */
export type AnfrageAntwort = AnfrageErgebnis & {
  computerAnfragen: AnfrageErgebnis[] | null // Zug des Computers, nur im Modus computer
  match: Match
}

/**
 * Ein Eintrag in der Ergebnisliste eines Nutzers (Result in der openapi.yaml). Der Server legt ihn
 * selbst an. minAnfragen und effizienz fehlen noch, sie gehören zur offenen Punktevergabe.
 */
export type Ergebnis = {
  id: string
  matchId: string
  competitionId: string | null // nur bei Matches eines Turniers gesetzt
  runde: number | null // Runde im Turnier, sonst null
  platzierung: number | null // Endplatz im Turnier, sonst null
  modus: Modus
  schwierigkeit: Schwierigkeit | null // nur im Modus computer gesetzt
  gegner: string // Name des Gegners, beim Computer "Computer"
  ausgang: 'sieg' | 'niederlage'
  endegrund: Endegrund
  anfragen: number // Anfragen des Nutzers in diesem Match
  beendetAm: string
}

/** Siege, Niederlagen und Quote eines Nutzers; der Server rechnet, der Client zeigt nur an */
export type Statistik = {
  siege: number
  niederlagen: number
  quote: number // siege / (siege + niederlagen), bei 0 Spielen 0
}

/**
 * Pause zwischen zwei Anfragen des Computers bei der Wiedergabe im Client. Der Server verlängert
 * um diese Zeit pro Anfrage die Zugfrist danach, damit die Wiedergabe keine Bedenkzeit kostet.
 */
export const WIEDERGABE_PAUSE_MS = 700

/** Maximale Anzahl an Mauern */
export const MAX_MAUERN = 30

/** Erlaubte Längen laut Credentials in der openapi.yaml; Server und Client prüfen dieselben Werte */
export const NAME_LAENGE = { min: 3, max: 20 }
export const PASSWORT_LAENGE = { min: 8, max: 100 }
