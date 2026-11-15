import type {
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
  karte: BekannteKarte // eigene Suche im Labyrinth des Gegners
  anfragen: number // Zahl der gestellten Anfragen, für das Ergebnis
}

/** Ein Match aus Sicht des Servers, mit beiden Labyrinthen. Speichert nur Fakten. */
export type MatchIntern = {
  id: string
  version: number // steigt bei jeder Änderung
  modus: Modus
  schwierigkeit: Schwierigkeit | null // nur im Modus computer gesetzt
  status: MatchStatus
  spieler: SpielerDaten[]
  amZug: string | null // Id des Spielers, der Anfragen stellen darf; im Aufbau niemand
  anfrageNr: number // Nummer der nächsten erwarteten Anfrage, beginnt bei 1
  aufbauEndeAm: Date | null // nur im Status aufbau gesetzt
  siegerId: string | null // erst nach Spielende gesetzt
  endegrund: Endegrund | null // erst nach Spielende gesetzt
}
