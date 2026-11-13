import { afterEach, describe, expect, it, vi } from 'vitest'
import { abfragen, ApiFehler, get } from '../api'

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

describe('abfragen', () => {
  it('hängt since an den Pfad an', async () => {
    fetchAttrappe(async () => Response.json({ version: 4 }))
    await abfragen('/matches/1', 3)
    expect(fetch).toHaveBeenCalledWith('/api/matches/1?since=3', expect.anything())
  })

  it('lässt since beim ersten Abruf weg', async () => {
    fetchAttrappe(async () => Response.json({ version: 0 }))
    await abfragen('/matches/1')
    expect(fetch).toHaveBeenCalledWith('/api/matches/1', expect.anything())
  })

  it('liefert den neuen Stand bei 200', async () => {
    fetchAttrappe(async () => Response.json({ version: 4 }))
    await expect(abfragen<{ version: number }>('/matches/1', 3)).resolves.toEqual({ version: 4 })
  })

  it('liefert null bei 304 statt eines Fehlers', async () => {
    fetchAttrappe(async () => new Response(null, { status: 304 }))
    await expect(abfragen('/matches/1', 4)).resolves.toBeNull()
  })
})
