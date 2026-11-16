import { assertEquals } from '@std/assert'
import {
  aufgeben,
  bereitBestaetigen,
  computerMatchErstellen,
  entwurfSpeichern,
  labyrinthSetzen,
} from './ablauf.ts'
import { ergebnisseAus } from './ergebnis.ts'
import { fristenPruefen } from './fristpruefung.ts'

const NUTZER = { id: 'n1', name: 'Nudl' }
const JETZT = new Date('2026-11-15T10:00:00Z')
const ZUERST = () => 0

function startbereitesMatch() {
  const match = computerMatchErstellen(NUTZER, 'schwer', JETZT, ZUERST)
  entwurfSpeichern(match, NUTZER.id, { schatz: 'F6', mauern: [] })
  labyrinthSetzen(match, NUTZER.id, JETZT)
  return match
}

Deno.test('ergebnisseAus: laufendes Match hat keine Ergebnisse', () => {
  const match = startbereitesMatch()
  bereitBestaetigen(match, NUTZER.id, JETZT, ZUERST)
  assertEquals(ergebnisseAus(match), [])
})

Deno.test('ergebnisseAus: ein Eintrag für den Menschen, keiner für den Computer', () => {
  const match = startbereitesMatch()
  bereitBestaetigen(match, NUTZER.id, JETZT, ZUERST)
  aufgeben(match, NUTZER.id, new Date('2026-11-15T10:01:00Z'))

  const [eintrag, ...rest] = ergebnisseAus(match)
  assertEquals(rest, [])
  assertEquals(eintrag.nutzerId, NUTZER.id)
  assertEquals(eintrag.matchId, match.id)
  assertEquals(eintrag.gegner, 'Computer')
  assertEquals(eintrag.ausgang, 'niederlage')
  assertEquals(eintrag.endegrund, 'aufgabe')
  assertEquals(eintrag.schwierigkeit, 'schwer')
  assertEquals(eintrag.anfragen, 0)
  assertEquals(eintrag.beendetAm, '2026-11-15T10:01:00.000Z')
})

Deno.test('ergebnisseAus: Ende per Frist trägt das Fristende als Zeitpunkt ein', () => {
  const match = startbereitesMatch()
  // Zehn Minuten später: Die Startfrist endete schon nach 30 Sekunden
  fristenPruefen(match, new Date('2026-11-15T10:10:00Z'))
  assertEquals(ergebnisseAus(match)[0].beendetAm, '2026-11-15T10:00:30.000Z')
})

Deno.test('ergebnisseAus: abgebrochenes Match hat keine Ergebnisse', () => {
  const match = startbereitesMatch()
  match.spieler[1].startBestaetigt = false
  fristenPruefen(match, new Date('2026-11-15T10:10:00Z'))
  assertEquals(match.status, 'abgebrochen')
  assertEquals(ergebnisseAus(match), [])
})
