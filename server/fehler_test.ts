import { assertEquals, assertFalse } from '@std/assert'
import { Hono } from '@hono/hono'
import { ApiFehler, fehlerBehandeln } from './fehler.ts'

// Eigene kleine App nur für diese Tests, damit main.ts keine Testrouten braucht
const testApp = new Hono()
testApp.onError(fehlerBehandeln)

testApp.get('/fachfehler', () => {
  throw new ApiFehler(409, 'NICHT_AM_ZUG', 'Der Gegner ist am Zug.')
})

testApp.get('/unloesbar', () => {
  throw new ApiFehler(422, 'LABYRINTH_UNLOESBAR', 'Schatz nicht erreichbar.', {
    problematischeMauern: ['B2_B3', 'C2_C3'],
  })
})

testApp.get('/absturz', () => {
  throw new Error('geheime Interna')
})

Deno.test('ApiFehler liefert Status, Code und Nachricht', async () => {
  const res = await testApp.request('/fachfehler')
  assertEquals(res.status, 409)
  assertEquals(await res.json(), {
    fehler: { code: 'NICHT_AM_ZUG', nachricht: 'Der Gegner ist am Zug.' },
  })
})

Deno.test('ApiFehler übernimmt Zusatzfelder', async () => {
  const res = await testApp.request('/unloesbar')
  assertEquals(res.status, 422)
  const data = await res.json()
  assertEquals(data.fehler.problematischeMauern, ['B2_B3', 'C2_C3'])
})

Deno.test('unerwarteter Fehler liefert 500 ohne Interna', async () => {
  const originalError = console.error
  console.error = () => {} // Testausgabe ruhig halten
  try {
    const res = await testApp.request('/absturz')
    assertEquals(res.status, 500)
    const data = await res.json()
    assertEquals(data.fehler.code, 'INTERN')
    assertFalse(JSON.stringify(data).includes('geheim'))
  } finally {
    console.error = originalError
  }
})
