import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiFehler } from '../api'
import { aufgeben, beitreten, duellAnlegen, matchAnlegen, offenesMatch } from '../matches'
import { beispielMatch, nichtAngemeldet, nichtErreichbar, serverAttrappe } from './hilfen'

afterEach(() => vi.unstubAllGlobals())

const keinMatch = () =>
  Response.json(
    { fehler: { code: 'NICHT_GEFUNDEN', nachricht: 'Du hast kein offenes Match.' } },
    { status: 404 },
  )

describe('matchAnlegen', () => {
  it('schickt Modus und Schwierigkeit per POST und liefert das Match', async () => {
    const attrappe = serverAttrappe({
      '/api/matches': () => Response.json(beispielMatch(), { status: 201 }),
    })
    const match = await matchAnlegen('schwer')

    const [, optionen] = attrappe.mock.calls[0]!
    expect(optionen?.method).toBe('POST')
    expect(JSON.parse(optionen?.body as string)).toEqual({
      modus: 'computer',
      schwierigkeit: 'schwer',
    })
    expect(match.id).toBe('match-1')
  })
})

describe('duellAnlegen und beitreten', () => {
  it('duellAnlegen schickt nur den Modus duell', async () => {
    const attrappe = serverAttrappe({
      '/api/matches': () => Response.json(beispielMatch({ status: 'wartet' }), { status: 201 }),
    })
    expect((await duellAnlegen()).status).toBe('wartet')
    expect(JSON.parse(attrappe.mock.calls[0]![1]?.body as string)).toEqual({ modus: 'duell' })
  })

  it('beitreten schickt den Code an /matches/join', async () => {
    const attrappe = serverAttrappe({ '/api/matches/join': () => Response.json(beispielMatch()) })
    await beitreten('K7M2P')
    const [, optionen] = attrappe.mock.calls[0]!
    expect(optionen?.method).toBe('POST')
    expect(JSON.parse(optionen?.body as string)).toEqual({ code: 'K7M2P' })
  })
})

describe('offenesMatch', () => {
  it('liefert das Match, wenn es eins gibt', async () => {
    serverAttrappe({ '/api/matches/current': () => Response.json(beispielMatch()) })
    expect((await offenesMatch())?.id).toBe('match-1')
  })

  it('liefert null bei 404, denn kein offenes Match ist der Normalfall', async () => {
    serverAttrappe({ '/api/matches/current': keinMatch })
    expect(await offenesMatch()).toBeNull()
  })

  it('reicht andere Fehler weiter: 401 und Netzwerk', async () => {
    serverAttrappe({ '/api/matches/current': nichtAngemeldet })
    await expect(offenesMatch()).rejects.toMatchObject({ status: 401 })

    serverAttrappe({ '/api/matches/current': nichtErreichbar })
    await expect(offenesMatch()).rejects.toBeInstanceOf(ApiFehler)
  })
})

describe('aufgeben', () => {
  it('ruft resign mit der Match-Id auf', async () => {
    const attrappe = serverAttrappe({
      '/api/matches/abc/resign': () => Response.json(beispielMatch({ status: 'beendet' })),
    })
    const match = await aufgeben('abc')
    expect(attrappe.mock.calls[0]![1]?.method).toBe('POST')
    expect(match.status).toBe('beendet')
  })
})
