import { assert, assertEquals, assertFalse, assertNotEquals } from '@std/assert'
import { passwortHashen, passwortPruefen } from './passwort.ts'

Deno.test('passwortHashen: Format iterationen:salt:hash', async () => {
  const gespeichert = await passwortHashen('geheim1234')
  assert(/^600000:[0-9a-f]{32}:[0-9a-f]{64}$/.test(gespeichert))
})

Deno.test('passwortHashen: Hash enthält das Passwort nicht', async () => {
  const gespeichert = await passwortHashen('geheim1234')
  assertFalse(gespeichert.includes('geheim1234'))
})

Deno.test('passwortHashen: gleiches Passwort ergibt verschiedene Hashes (Salt)', async () => {
  const a = await passwortHashen('geheim1234')
  const b = await passwortHashen('geheim1234')
  assertNotEquals(a, b)
})

Deno.test('passwortPruefen: richtiges Passwort besteht', async () => {
  const gespeichert = await passwortHashen('geheim1234')
  assert(await passwortPruefen('geheim1234', gespeichert))
})

Deno.test('passwortPruefen: falsches Passwort fällt durch', async () => {
  const gespeichert = await passwortHashen('geheim1234')
  assertFalse(await passwortPruefen('geheim1235', gespeichert))
  assertFalse(await passwortPruefen('Geheim1234', gespeichert))
  assertFalse(await passwortPruefen('', gespeichert))
})

Deno.test('passwortPruefen: kaputter gespeicherter Text ergibt false', async () => {
  const kaputt = ['', 'geheim1234', '600000:abc', 'x:00ff:00ff', '0:00ff:00ff', '600000:zz:00ff']
  for (const text of kaputt) {
    assertEquals(await passwortPruefen('geheim1234', text), false, text)
  }
})
