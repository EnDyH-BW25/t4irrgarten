import type { Nutzer } from '@shared/types.ts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { routerErstellen } from '../router'
import { nutzer } from '../anmeldung'
import { nichtAngemeldet, nichtErreichbar, serverAttrappe } from './hilfen'

const NUDL: Nutzer = { id: 'id-1', name: 'nudl', schwierigkeit: 'standard' }
const angemeldet = () => Response.json(NUDL)

/** Neuer Router wie nach dem Laden der Seite, liefert den Pfad nach der Navigation */
async function oeffnen(pfad: string) {
  const router = routerErstellen(createMemoryHistory())
  await router.push(pfad)
  return { router, pfad: router.currentRoute.value.path }
}

beforeEach(() => {
  nutzer.value = null
})
afterEach(() => vi.unstubAllGlobals())

describe('Router-Guard', () => {
  it('bleibt nach dem Neuladen angemeldet, wenn die Session gilt', async () => {
    serverAttrappe({ '/api/auth/me': angemeldet })
    const { pfad } = await oeffnen('/dashboard')
    expect(pfad).toBe('/dashboard')
    expect(nutzer.value).toEqual(NUDL)
  })

  it('leitet ohne Anmeldung vom Dashboard auf die Startseite', async () => {
    serverAttrappe({ '/api/auth/me': nichtAngemeldet })
    expect((await oeffnen('/dashboard')).pfad).toBe('/')
  })

  it('lässt die Startseite ohne Anmeldung offen', async () => {
    serverAttrappe({ '/api/auth/me': nichtAngemeldet })
    expect((await oeffnen('/')).pfad).toBe('/')
  })

  it('leitet Angemeldete von der Startseite zum Dashboard', async () => {
    serverAttrappe({ '/api/auth/me': angemeldet })
    expect((await oeffnen('/')).pfad).toBe('/dashboard')
  })

  it('schützt unbekannte Pfade über die Umleitung auf die Startseite', async () => {
    serverAttrappe({ '/api/auth/me': nichtAngemeldet })
    expect((await oeffnen('/gibt-es-nicht')).pfad).toBe('/')
  })

  it('fragt den Server nur beim ersten Seitenwechsel', async () => {
    const attrappe = serverAttrappe({ '/api/auth/me': angemeldet })
    const { router } = await oeffnen('/dashboard')
    await router.push('/')
    await router.push('/dashboard')
    expect(attrappe).toHaveBeenCalledTimes(1)
  })

  it('behandelt einen nicht erreichbaren Server als abgemeldet und fragt erneut', async () => {
    const attrappe = serverAttrappe({ '/api/auth/me': nichtErreichbar })
    const { router, pfad } = await oeffnen('/dashboard')
    expect(pfad).toBe('/')

    // Auch die Umleitung auf / ist ein Seitenwechsel und fragt. Wichtig ist nur: Es kommt eine weitere Frage dazu.
    const bisher = attrappe.mock.calls.length
    await router.push('/dashboard')
    expect(attrappe.mock.calls.length).toBeGreaterThan(bisher)
  })
})
