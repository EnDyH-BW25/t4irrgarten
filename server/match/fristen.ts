/**
 * FRISTEN: alle Zeitgrenzen eines Matches an einer Stelle (Aufbaudauer 3 min steht in ablauf.ts)
 * Der Server speichert nur das Ende einer Frist (z. B. zugEndeAm). Ob sie abgelaufen ist,
 * prüft fristpruefung.ts beim nächsten Abruf (ADR-028, kein Timer).
 * Schreibweise 10 * 60 * 1000: lesbarer als 600000 (Minuten * Sekunden * Millisekunden).
 */

/** Gültigkeit des Spielcodes im Warteraum (ADR-009) */
export const CODE_DAUER_MS = 10 * 60 * 1000

/** Zusatzzeit, wenn der Schatz bei Ende des Aufbaus nicht erreichbar ist */
export const NACHBESSERUNG_DAUER_MS = 60 * 1000

/** Zeit für die Bereitschaft im Overlay "Bist du bereit zu spielen?" */
export const START_FRIST_MS = 30 * 1000

/** Bedenkzeit im eigenen Zug; jede Anfrage startet sie neu */
export const ZUG_FRIST_MS = 60 * 1000

/**
 * Zeit ohne Abruf, nach der ein Spieler als abwesend gilt (Tab zu, Netz weg)
 * Der Client fragt alle 1,5 s ab. 15 s ohne Abruf heißen also: Der Browser ist weg.
 */
export const ABRUF_FRIST_MS = 15 * 1000
