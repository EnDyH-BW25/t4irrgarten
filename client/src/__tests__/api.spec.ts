import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiFehler, get } from '../api'

// Ersetzt fetch durch eine Attrappe, die immer die übergebene Antwort liefert
function fetchAttrappe(antwort: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(antwort))
}

// Wartet auf das Versprechen und liefert den ApiFehler, den es wirft
async function fehlerVon(versprechen: Promise<unknown>): Promise<ApiFehler> {
  try {
    await versprechen
  } catch (e) {
    if (e instanceof ApiFehler) return e
  }
  throw new Error('ApiFehler erwartet')
}

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('liefert die Daten bei Erfolg', async () => {
    fetchAttrappe(async () => Response.json({ status: 'ok' }))
    await expect(get<{ status: string }>('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('wirft ApiFehler mit Code und Nachricht des Servers', async () => {
    fetchAttrappe(async () =>
      Response.json(
        { fehler: { code: 'NICHT_AM_ZUG', nachricht: 'Der Gegner ist am Zug.' } },
        { status: 409 },
      ),
    )
    const fehler = await fehlerVon(get('/matches/1'))
    expect(fehler.status).toBe(409)
    expect(fehler.code).toBe('NICHT_AM_ZUG')
    expect(fehler.message).toBe('Der Gegner ist am Zug.')
  })

  it('wirft NETZWERK, wenn der Server nicht antwortet', async () => {
    fetchAttrappe(async () => {
      throw new TypeError('Failed to fetch')
    })
    const fehler = await fehlerVon(get('/health'))
    expect(fehler.code).toBe('NETZWERK')
  })

  it('wirft NETZWERK, wenn der Proxy mit 502 antwortet', async () => {
    fetchAttrappe(async () => new Response('', { status: 502 }))
    const fehler = await fehlerVon(get('/health'))
    expect(fehler.code).toBe('NETZWERK')
    expect(fehler.message).toBe('Der Server ist nicht erreichbar.')
  })
})
