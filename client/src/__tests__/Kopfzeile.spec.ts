import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { routerErstellen } from '../router'
import { nutzer } from '../anmeldung'
import { nichtAngemeldet, nichtErreichbar, serverAttrappe } from './hilfen'

const NUDL = { id: 'id-1', name: 'nudl' }
const angemeldet = () => Response.json(NUDL)

/** Frischer Router pro Test, damit der Guard jedes Mal neu prüft */
async function aufbauen(pfad: string) {
  const router = routerErstellen(createMemoryHistory())
  router.push(pfad)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  nutzer.value = null
})
afterEach(() => vi.unstubAllGlobals())

describe('Kopfzeile', () => {
  it('zeigt ohne Anmeldung weder Name noch Abmelden', async () => {
    serverAttrappe({ '/api/auth/me': nichtAngemeldet })
    const { wrapper } = await aufbauen('/')
    expect(wrapper.find('[data-test=nutzername]').exists()).toBe(false)
    expect(wrapper.find('[data-test=abmelden]').exists()).toBe(false)
  })

  it('zeigt angemeldet den Namen und meldet per Klick ab', async () => {
    serverAttrappe({
      '/api/auth/me': angemeldet,
      '/api/auth/logout': () => new Response(null, { status: 204 }),
    })
    const { wrapper, router } = await aufbauen('/dashboard')
    expect(wrapper.find('[data-test=nutzername]').text()).toBe('nudl')

    await wrapper.find('[data-test=abmelden]').trigger('click')
    await flushPromises()

    expect(nutzer.value).toBeNull()
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.find('[data-test=abmelden]').exists()).toBe(false)
  })

  it('zeigt einen Fehler, wenn der Server beim Abmelden nicht erreichbar ist', async () => {
    serverAttrappe({ '/api/auth/me': angemeldet, '/api/auth/logout': nichtErreichbar })
    const { wrapper } = await aufbauen('/dashboard')
    await wrapper.find('[data-test=abmelden]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role=alert]').text()).toBe('Der Server ist nicht erreichbar.')
    expect(nutzer.value).toEqual(NUDL)
  })
})
