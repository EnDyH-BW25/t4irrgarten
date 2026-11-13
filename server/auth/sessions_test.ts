import { assertEquals, assertNotEquals } from '@std/assert'
import { Sessions } from './sessions.ts'

Deno.test('starten: Session liefert die Nutzer-Id', () => {
  const sessions = new Sessions()
  const sid = sessions.starten('nutzer-1')
  assertEquals(sessions.nutzerId(sid), 'nutzer-1')
})

Deno.test('starten: jede Session hat eine eigene Id, auch beim selben Nutzer', () => {
  const sessions = new Sessions()
  const handy = sessions.starten('nutzer-1')
  const laptop = sessions.starten('nutzer-1')
  assertNotEquals(handy, laptop)
  assertEquals(sessions.nutzerId(handy), 'nutzer-1')
  assertEquals(sessions.nutzerId(laptop), 'nutzer-1')
})

Deno.test('nutzerId: unbekannte Session ergibt null', () => {
  const sessions = new Sessions()
  assertEquals(sessions.nutzerId('ausgedacht'), null)
})

Deno.test('beenden: Session ist danach ungültig, andere bleiben', () => {
  const sessions = new Sessions()
  const handy = sessions.starten('nutzer-1')
  const laptop = sessions.starten('nutzer-1')
  sessions.beenden(handy)
  assertEquals(sessions.nutzerId(handy), null)
  assertEquals(sessions.nutzerId(laptop), 'nutzer-1')
})

Deno.test('beenden: unbekannte Session wirft keinen Fehler', () => {
  const sessions = new Sessions()
  sessions.beenden('ausgedacht')
})
