import type {
  AnfrageErgebnis,
  Endegrund,
  Labyrinth,
  Nutzer,
  Schwierigkeit,
  Zelle,
} from '../../shared/types.ts'
import { ApiFehler } from '../fehler.ts'
import { anfrageAuswerten } from '../spiellogik/anfrage.ts'
import { labyrinthErzeugen, type Zufall } from '../spiellogik/generator.ts'
import { karteFortschreiben, neueKarte } from '../spiellogik/karte.ts'
import { istZelle } from '../spiellogik/koordinaten.ts'
import { entwurfPruefen, loesbarkeitPruefen } from '../spiellogik/regeln.ts'
import { computerZug } from '../spiellogik/sucher.ts'
import { START_FRIST_MS, ZUG_FRIST_MS } from './fristen.ts'
import type { MatchIntern, SpielerDaten } from './typen.ts'

/** Der Computer als Spieler; die Id ist fest, weil es kein Nutzerkonto gibt */
export const COMPUTER = { id: 'computer', name: 'Computer' }

/** Dauer der Aufbauzeit */
export const AUFBAU_DAUER_MS = 3 * 60 * 1000

// ---------- 4.1 Erstellen ----------

/** Legt ein Match gegen den Computer an. Der Computer hat sein Labyrinth sofort gesetzt. */
export function computerMatchErstellen(
  nutzer: Pick<Nutzer, 'id' | 'name'>,
  schwierigkeit: Schwierigkeit,
  jetzt: Date,
  zufall: Zufall = Math.random,
): MatchIntern {
  const mensch = spielerAnlegen(nutzer.id, nutzer.name, false, jetzt)
  const computer = spielerAnlegen(COMPUTER.id, COMPUTER.name, true, jetzt)
  computer.entwurf = labyrinthErzeugen(schwierigkeit, zufall)
  computer.gesetzt = true

  return {
    id: crypto.randomUUID(),
    version: 1,
    modus: 'computer',
    schwierigkeit,
    status: 'aufbau',
    spieler: [mensch, computer],
    amZug: null,
    anfrageNr: 1,
    aufbauEndeAm: new Date(jetzt.getTime() + AUFBAU_DAUER_MS),
    startFristEndeAm: null,
    zugEndeAm: null,
    siegerId: null,
    endegrund: null,
  }
}

function spielerAnlegen(
  id: string,
  name: string,
  istComputer: boolean,
  jetzt: Date,
): SpielerDaten {
  return {
    id,
    name,
    istComputer,
    entwurf: { schatz: null, mauern: [] },
    gesetzt: false,
    startBestaetigt: false,
    karte: neueKarte(),
    anfragen: 0,
    nachbesserungEndeAm: null,
    letzterAbrufAm: jetzt,
  }
}

/** Liefert den anfragenden Spieler und seinen Gegner. Fremde Nutzer erhalten 403. */
export function teilnehmer(match: MatchIntern, nutzerId: string) {
  const ich = match.spieler.find((s) => s.id === nutzerId)
  if (!ich) throw new ApiFehler(403, 'VERBOTEN', 'Du spielst in diesem Match nicht mit.')
  const gegner = match.spieler.find((s) => s.id !== nutzerId) ?? null
  return { ich, gegner }
}

// ---------- 4.2 Aufbau ----------

/** Speichert den Entwurf des Spielers. Auch ein unlösbarer Entwurf bleibt gespeichert. */
export function entwurfSpeichern(match: MatchIntern, nutzerId: string, eingabe: unknown): void {
  const { ich } = teilnehmer(match, nutzerId)
  aufbauPruefen(match, ich)

  const form = entwurfPruefen(entwurfLesen(eingabe))
  if (!form.ok) {
    throw new ApiFehler(400, 'VALIDIERUNG', 'Der Entwurf ist ungültig.', { details: form.details })
  }
  ich.entwurf = form.entwurf
  match.version++
}

/** "Irrgarten setzen": prüft den Entwurf erneut. Haben alle gesetzt, folgt die Bereitschaft. */
export function labyrinthSetzen(match: MatchIntern, nutzerId: string, jetzt: Date) {
  const { ich } = teilnehmer(match, nutzerId)
  aufbauPruefen(match, ich)

  if (ich.entwurf.schatz === null) {
    throw new ApiFehler(422, 'SCHATZ_FEHLT', 'Platziere zuerst deinen Schatz.')
  }
  const pruefung = loesbarkeitPruefen(ich.entwurf)
  if (!pruefung.loesbar) {
    throw new ApiFehler(422, 'LABYRINTH_UNLOESBAR', 'Schatz nicht erreichbar.', {
      problematischeMauern: pruefung.problematischeMauern,
    })
  }

  ich.gesetzt = true
  // Setzt der Spieler während der Nachbesserung selbst, endet sie
  ich.nachbesserungEndeAm = null
  if (match.spieler.every((s) => s.gesetzt)) startbereitMachen(match, jetzt)
  match.version++
}

/**
 * Beide Labyrinthe stehen: Das Overlay fragt nach der Bereitschaft. Der Computer ist immer bereit.
 * `ab` ist der Zeitpunkt, an dem der Aufbau endete. Die Startfrist zählt ab dort.
 */
export function startbereitMachen(match: MatchIntern, ab: Date): void {
  match.status = 'startbereit'
  match.aufbauEndeAm = null
  match.startFristEndeAm = new Date(ab.getTime() + START_FRIST_MS)
  for (const s of match.spieler) if (s.istComputer) s.startBestaetigt = true
}

// ---------- Bereitschaft ----------

/** "Spiel starten" im Overlay. Sind alle bereit, beginnt das Spiel. */
export function bereitBestaetigen(
  match: MatchIntern,
  nutzerId: string,
  jetzt: Date,
  zufall: Zufall = Math.random,
): void {
  const { ich } = teilnehmer(match, nutzerId)
  if (match.status !== 'startbereit') {
    throw new ApiFehler(409, 'KONFLIKT', 'Das Match wartet nicht auf deine Bereitschaft.')
  }
  // Doppelklick: Die zweite Bestätigung ändert nichts
  if (ich.startBestaetigt) return

  ich.startBestaetigt = true
  if (match.spieler.every((s) => s.startBestaetigt)) spielStarten(match, jetzt, zufall)
  match.version++
}

function spielStarten(match: MatchIntern, jetzt: Date, zufall: Zufall): void {
  match.status = 'laeuft'
  match.startFristEndeAm = null
  // Die Abruffrist beginnt mit dem Spiel; vorher galt die Startfrist
  for (const s of match.spieler) s.letzterAbrufAm = jetzt
  // Auslosung: jeder Spieler mit gleicher Chance
  match.amZug = match.spieler[Math.floor(zufall() * match.spieler.length)].id
  if (match.spieler.find((s) => s.id === match.amZug)!.istComputer) computerSpielt(match, zufall)
  zugFristStarten(match, jetzt)
}

/** Startet die Zugfrist für den Spieler in amZug. Nach Spielende gibt es keine. */
function zugFristStarten(match: MatchIntern, jetzt: Date): void {
  match.zugEndeAm = match.status === 'laeuft' ? new Date(jetzt.getTime() + ZUG_FRIST_MS) : null
}

function aufbauPruefen(match: MatchIntern, ich: SpielerDaten): void {
  if (ich.gesetzt) throw new ApiFehler(409, 'AUFBAU_BEENDET', 'Dein Labyrinth ist bereits gesetzt.')
  if (match.status !== 'aufbau') throw new ApiFehler(409, 'KONFLIKT', 'Der Aufbau ist vorbei.')
}

/** Prüft die Form des Request-Body, bevor entwurfPruefen die Inhalte prüft */
function entwurfLesen(eingabe: unknown): { schatz: string | null; mauern: string[] } {
  const objekt = objektLesen(eingabe)
  const details = []
  if (objekt.schatz !== null && typeof objekt.schatz !== 'string') {
    details.push({ feld: 'schatz', problem: 'Erwartet wird eine Zelle oder null.' })
  }
  const mauern = objekt.mauern
  if (!Array.isArray(mauern) || !mauern.every((m) => typeof m === 'string')) {
    details.push({ feld: 'mauern', problem: 'Erwartet wird eine Liste von Mauern.' })
  }
  if (details.length > 0) throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', { details })
  return { schatz: objekt.schatz as string | null, mauern: mauern as string[] }
}

function objektLesen(eingabe: unknown): Record<string, unknown> {
  if (typeof eingabe !== 'object' || eingabe === null || Array.isArray(eingabe)) {
    throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', {
      details: [{ feld: 'body', problem: 'Erwartet wird ein JSON-Objekt.' }],
    })
  }
  return eingabe as Record<string, unknown>
}

// ---------- Aufgeben ----------

/** Der Spieler gibt auf, im Aufbau wie im Spiel. Der Gegner gewinnt. */
export function aufgeben(match: MatchIntern, nutzerId: string): void {
  const { gegner } = teilnehmer(match, nutzerId)
  if (!['aufbau', 'startbereit', 'laeuft'].includes(match.status)) {
    throw new ApiFehler(409, 'KONFLIKT', 'Das Match ist schon vorbei.')
  }
  // Im Modus computer gibt es immer einen Gegner; ohne Gegner (Duell im Status wartet) folgt Phase 4
  beenden(match, gegner!.id, 'aufgabe')
  match.version++
}

// ---------- 4.3 Anfragen ----------

/** Ergebnis einer Anfrage; die Route ergänzt daraus die AnfrageAntwort */
export type AnfrageAusgang = {
  ergebnis: AnfrageErgebnis
  computerAnfragen: AnfrageErgebnis[] | null // nur im Modus computer
}

/**
 * Stellt eine Anfrage. Endet der Zug, spielt im Modus computer sofort der Computer.
 * Jede Anfrage startet die Zugfrist neu, nach einem Zugwechsel für den Gegner.
 */
export function anfrageStellen(
  match: MatchIntern,
  nutzerId: string,
  eingabe: unknown,
  jetzt: Date,
  zufall: Zufall = Math.random,
): AnfrageAusgang {
  const { ich, gegner } = teilnehmer(match, nutzerId)
  const { anfrageNr, ziel } = anfrageLesen(eingabe)

  if (match.status !== 'laeuft') throw new ApiFehler(409, 'KONFLIKT', 'Das Spiel läuft nicht.')
  if (match.amZug !== ich.id) throw new ApiFehler(409, 'NICHT_AM_ZUG', 'Der Gegner ist am Zug.')
  if (anfrageNr !== match.anfrageNr) {
    // Schutz vor Doppelklick: dieselbe Anfrage zählt nur einmal
    throw new ApiFehler(409, 'KONFLIKT', `Erwartet wird Anfrage ${match.anfrageNr}.`)
  }

  const labyrinth = gesetztesLabyrinth(gegner!)
  const ergebnis = anfrageAuswerten(ich.karte.position, ziel, labyrinth.mauern, labyrinth.schatz)
  if (!ergebnis) {
    throw new ApiFehler(
      400,
      'ZIEL_NICHT_GERADE',
      'Das Ziel muss in derselben Zeile oder Spalte liegen.',
    )
  }

  anfrageEintragen(match, ich, ergebnis)
  let computerAnfragen: AnfrageErgebnis[] | null = match.modus === 'computer' ? [] : null

  if (ergebnis.ergebnis === 'schatzGefunden') {
    beenden(match, ich.id, 'schatz')
  } else if (ergebnis.ergebnis !== 'ja') {
    // nurBis oder nein: Der Zug wechselt
    match.amZug = gegner!.id
    if (gegner!.istComputer) computerAnfragen = computerSpielt(match, zufall)
  }

  zugFristStarten(match, jetzt)
  match.version++
  return { ergebnis, computerAnfragen }
}

/** Spielt den ganzen Zug des Computers und gibt den Zug danach zurück */
function computerSpielt(match: MatchIntern, zufall: Zufall): AnfrageErgebnis[] {
  const computer = match.spieler.find((s) => s.istComputer)!
  const mensch = match.spieler.find((s) => !s.istComputer)!

  const zug = computerZug(gesetztesLabyrinth(mensch), computer.karte, zufall)
  for (const ergebnis of zug.anfragen) anfrageEintragen(match, computer, ergebnis)

  const letzte = zug.anfragen[zug.anfragen.length - 1]
  if (letzte.ergebnis === 'schatzGefunden') beenden(match, computer.id, 'schatz')
  else match.amZug = mensch.id
  return zug.anfragen
}

function anfrageEintragen(match: MatchIntern, spieler: SpielerDaten, ergebnis: AnfrageErgebnis) {
  spieler.karte = karteFortschreiben(spieler.karte, ergebnis)
  spieler.anfragen++
  match.anfrageNr++
}

/** Beendet das Match mit Sieger. Alle Fristen enden mit. */
export function beenden(match: MatchIntern, siegerId: string, grund: Endegrund): void {
  match.status = 'beendet'
  fristenLoeschen(match)
  match.siegerId = siegerId
  match.endegrund = grund
}

/** Bricht das Match ohne Sieger und ohne Ergebnis ab */
export function abbrechen(match: MatchIntern): void {
  match.status = 'abgebrochen'
  fristenLoeschen(match)
}

function fristenLoeschen(match: MatchIntern): void {
  match.amZug = null
  match.aufbauEndeAm = null
  match.startFristEndeAm = null
  match.zugEndeAm = null
  for (const s of match.spieler) s.nachbesserungEndeAm = null
}

/** Nach dem Setzen liegt der Schatz sicher; vorher wäre das ein Programmfehler */
export function gesetztesLabyrinth(spieler: SpielerDaten): Labyrinth {
  const { schatz, mauern } = spieler.entwurf
  if (!spieler.gesetzt || schatz === null) throw new Error(`${spieler.id} hat nicht gesetzt.`)
  return { schatz, mauern }
}

function anfrageLesen(eingabe: unknown) {
  const { anfrageNr, ziel } = objektLesen(eingabe)
  const details = []
  if (typeof anfrageNr !== 'number' || !Number.isInteger(anfrageNr) || anfrageNr < 1) {
    details.push({ feld: 'anfrageNr', problem: 'Erwartet wird eine ganze Zahl ab 1.' })
  }
  if (typeof ziel !== 'string' || !istZelle(ziel)) {
    details.push({ feld: 'ziel', problem: 'Erwartet wird eine Zelle wie C4.' })
  }
  if (details.length > 0) throw new ApiFehler(400, 'VALIDIERUNG', 'Eingabe ungültig.', { details })
  return { anfrageNr: anfrageNr as number, ziel: ziel as Zelle }
}
