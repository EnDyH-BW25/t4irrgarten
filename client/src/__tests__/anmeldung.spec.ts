import type { Nutzer } from '@shared/types.ts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiFehler } from '../api'
import { abmelden, anmelden, nutzer, pruefen, registrieren } from '../anmeldung'

const NUDL: Nutzer = { id: 'id-1', name: 'nudl', schwierigkeit: 'standard' }

// Ersetzt fetch durch eine Attrappe und gibt sie zurück, damit Tests die Aufrufe prüfen können
function fetchAttrappe(antwort: () => Promise<Response>) {
  // typeof fetch: Die Attrappe hat dieselben Parameter wie fetch, mock.calls ist dadurch typisiert
  const attrappe = vi.fn<typeof fetch>(antwort)
  vi.stubGlobal('fetch', attrappe)
  return attrappe
}

const fehlerAntwort = (status: number, code: string) => async () =>
  Response.json({ fehler: { code, nachricht: 'Meldung vom Server' } }, { status })

const netzwerkFehler = async (): Promise<Response> => {
  throw new TypeError('Failed to fetch')
}

// Der Zustand liegt auf Modulebene und überlebt sonst von Test zu Test
beforeEach(() => {
  nutzer.value = null
})
afterEach(() => vi.unstubAllGlobals())

describe('anmelden', () => {
  it('schickt Name und Passwort an /api/auth/login und merkt sich den Nutzer', async () => {
    const attrappe = fetchAttrappe(async () => Response.json(NUDL))
    await anmelden('nudl', 'geheim1234')

    const [url, optionen] = attrappe.mock.calls[0]!
    expect(url).toBe('/api/auth/login')
    expect(optionen?.method).toBe('POST')
    expect(JSON.parse(optionen?.body as string)).toEqual({ name: 'nudl', passwort: 'geheim1234' })
    expect(nutzer.value).toEqual(NUDL)
  })

  it('reicht den ApiFehler unverändert weiter und bleibt abgemeldet', async () => {
    fetchAttrappe(fehlerAntwort(401, 'NICHT_ANGEMELDET'))
    const fehler = await anmelden('nudl', 'falsch123').catch((e) => e)
    expect(fehler).toBeInstanceOf(ApiFehler)
    expect(fehler.code).toBe('NICHT_ANGEMELDET')
    expect(nutzer.value).toBeNull()
  })
})

describe('registrieren', () => {
  it('nutzt /api/auth/register und merkt sich den Nutzer', async () => {
    const attrappe = fetchAttrappe(async () => Response.json(NUDL, { status: 201 }))
    await registrieren('nudl', 'geheim1234')
    expect(attrappe.mock.calls[0]?.[0]).toBe('/api/auth/register')
    expect(nutzer.value).toEqual(NUDL)
  })

  it('reicht KONFLIKT als ApiFehler weiter', async () => {
    fetchAttrappe(fehlerAntwort(409, 'KONFLIKT'))
    await expect(registrieren('nudl', 'geheim1234')).rejects.toMatchObject({ code: 'KONFLIKT' })
  })
})

describe('abmelden', () => {
  it('setzt den Nutzer nach Erfolg auf null', async () => {
    nutzer.value = NUDL
    fetchAttrappe(async () => new Response(null, { status: 204 }))
    await abmelden()
    expect(nutzer.value).toBeNull()
  })

  it('wertet 401 als schon abgemeldet und wirft nicht', async () => {
    nutzer.value = NUDL
    fetchAttrappe(fehlerAntwort(401, 'NICHT_ANGEMELDET'))
    await abmelden()
    expect(nutzer.value).toBeNull()
  })

  it('wirft bei Netzwerkfehler und bleibt angemeldet', async () => {
    nutzer.value = NUDL
    fetchAttrappe(netzwerkFehler)
    await expect(abmelden()).rejects.toMatchObject({ code: 'NETZWERK' })
    expect(nutzer.value).toEqual(NUDL)
  })
})

describe('pruefen', () => {
  it('übernimmt den Nutzer aus /api/auth/me', async () => {
    fetchAttrappe(async () => Response.json(NUDL))
    await pruefen()
    expect(nutzer.value).toEqual(NUDL)
  })

  it('setzt bei 401 null und wirft nicht', async () => {
    nutzer.value = NUDL
    fetchAttrappe(fehlerAntwort(401, 'NICHT_ANGEMELDET'))
    await pruefen()
    expect(nutzer.value).toBeNull()
  })

  it('wirft bei Netzwerkfehler weiter', async () => {
    fetchAttrappe(netzwerkFehler)
    await expect(pruefen()).rejects.toMatchObject({ code: 'NETZWERK' })
  })
})
