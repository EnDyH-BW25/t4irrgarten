import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'
import { nutzer } from '../anmeldung'

const NUDL = { id: 'id-1', name: 'nudl' }

async function aufbauen(pfad: string) {
  router.push(pfad)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  nutzer.value = null
})
afterEach(() => vi.unstubAllGlobals())

describe('Kopfzeile', () => {
  it('zeigt ohne Anmeldung weder Name noch Abmelden', async () => {
    const wrapper = await aufbauen('/')
    expect(wrapper.find('[data-test=nutzername]').exists()).toBe(false)
    expect(wrapper.find('[data-test=abmelden]').exists()).toBe(false)
  })

  it('zeigt angemeldet den Namen und meldet per Klick ab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )
    nutzer.value = NUDL
    const wrapper = await aufbauen('/dashboard')
    expect(wrapper.find('[data-test=nutzername]').text()).toBe('nudl')

    await wrapper.find('[data-test=abmelden]').trigger('click')
    await flushPromises()

    expect(nutzer.value).toBeNull()
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.find('[data-test=abmelden]').exists()).toBe(false)
  })

  it('zeigt einen Fehler, wenn der Server beim Abmelden nicht erreichbar ist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    nutzer.value = NUDL
    const wrapper = await aufbauen('/dashboard')
    await wrapper.find('[data-test=abmelden]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role=alert]').text()).toBe('Der Server ist nicht erreichbar.')
    expect(nutzer.value).toEqual(NUDL)
  })
})
