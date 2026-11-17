import type {
  AnfrageErgebnis,
  BekannteKarte,
  Endegrund,
  LabyrinthEntwurf,
  MatchStatus,
  Modus,
  Schwierigkeit,
} from '../../shared/types.ts'

/** Alles, was der Server über einen Spieler im Match weiß; verlässt den Server nie direkt */
export type SpielerDaten = {
  id: string
  name: string
  istComputer: boolean
  entwurf: LabyrinthEntwurf // eigenes Labyrinth; der Schatz fehlt, bis der Spieler ihn setzt
  gesetzt: boolean // "Irrgarten setzen" gedrückt, danach keine Änderung mehr
  startBestaetigt: boolean // "Spiel starten" im Overlay geklickt
  karte: BekannteKarte // eigene Suche im Labyrinth des Gegners
  anfragen: number // Zahl der gestellten Anfragen, für das Ergebnis
  verlauf: AnfrageErgebnis[] // alle eigenen Anfragen mit Antwort; der Gegner sieht sie live
  nachbesserungEndeAm: Date | null // nur gesetzt, wenn der Schatz bei Aufbauende nicht erreichbar war
  letzterAbrufAm: Date // letzter Zugriff des Browsers, Grundlage für die Abruffrist
}

/** Ein Match aus Sicht des Servers, mit beiden Labyrinthen. Speichert nur Fakten. */
export type MatchIntern = {
  id: string
  version: number // steigt bei jeder Änderung
  modus: Modus
  schwierigkeit: Schwierigkeit | null // nur im Modus computer gesetzt
  status: MatchStatus
  code: string | null // Spielcode des Duells, nur im Status wartet gesetzt
  codeEndeAm: Date | null // Ende der Gültigkeit des Codes, nur im Status wartet gesetzt
  competitionId: string | null // nur bei Matches eines Turniers gesetzt
  runde: number | null // Runde im Turnier, sonst null
  spieler: SpielerDaten[] // im Status wartet nur der Ersteller
  amZug: string | null // Id des Spielers, der Anfragen stellen darf; im Aufbau niemand
  anfrageNr: number // Nummer der nächsten erwarteten Anfrage, beginnt bei 1
  aufbauEndeAm: Date | null // nur im Status aufbau gesetzt
  startFristEndeAm: Date | null // nur im Status startbereit gesetzt
  zugEndeAm: Date | null // nur im Status laeuft gesetzt, gilt für den Spieler in amZug
  siegerId: string | null // erst nach Spielende gesetzt
  endegrund: Endegrund | null // erst nach Spielende gesetzt
  beendetAm: Date | null // Zeitpunkt des Spielendes; bei einer Frist deren Ende, nicht der Abruf
}
