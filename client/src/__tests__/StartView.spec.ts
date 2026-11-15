import type { Nutzer } from '@shared/types.ts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import StartView from '../views/StartView.vue'
import { nutzer } from '../anmeldung'

const NUDL: Nutzer = { id: 'id-1', name: 'nudl', schwierigkeit: 'standard' }

// Eigener Router im Speicher, damit der Test den Wechsel zum Dashboard sieht
async function aufbauen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: StartView },
      { path: '/dashboard', component: { template: '<p>Dashboard</p>' } },
    ],
  })
  router.push('/')
  await router.isReady()
  const wrapper = mount(StartView, { global: { plugins: [router] } })
  return { wrapper, router }
}

function fetchAttrappe(antwort: () => Promise<Response>) {
  const attrappe = vi.fn<typeof fetch>(antwort)
  vi.stubGlobal('fetch', attrappe)
  return attrappe
}

beforeEach(() => {
  nutzer.value = null
})
afterEach(() => vi.unstubAllGlobals())

describe('StartView', () => {
  it('zeigt "Passwort wiederholen" nur im Modus Registrieren', async () => {
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=passwortWiederholt]').exists()).toBe(false)
    await wrapper.find('[data-test=modus-registrieren]').trigger('click')
    expect(wrapper.find('[data-test=passwortWiederholt]').exists()).toBe(true)
  })

  it('prüft im Browser und schickt bei Fehlern nichts ab', async () => {
    const attrappe = fetchAttrappe(async () => Response.json(NUDL))
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=modus-registrieren]').trigger('click')
    await wrapper.find('[data-test=name]').setValue('ab')
    await wrapper.find('[data-test=passwort]').setValue('geheim1234')
    await wrapper.find('[data-test=passwortWiederholt]').setValue('geheim9999')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Der Name braucht 3 bis 20 Zeichen.')
    expect(wrapper.text()).toContain('Die Passwörter stimmen nicht überein.')
    expect(attrappe).not.toHaveBeenCalled()
  })

  it('wechselt nach erfolgreicher Anmeldung zum Dashboard', async () => {
    fetchAttrappe(async () => Response.json(NUDL))
    const { wrapper, router } = await aufbauen()
    await wrapper.find('[data-test=name]').setValue('nudl')
    await wrapper.find('[data-test=passwort]').setValue('geheim1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(nutzer.value).toEqual(NUDL)
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('zeigt die Meldung des Servers bei vergebenem Namen', async () => {
    fetchAttrappe(async () =>
      Response.json(
        { fehler: { code: 'KONFLIKT', nachricht: 'Der Name ist schon vergeben.' } },
        { status: 409 },
      ),
    )
    const { wrapper, router } = await aufbauen()
    await wrapper.find('[data-test=modus-registrieren]').trigger('click')
    await wrapper.find('[data-test=name]').setValue('nudl')
    await wrapper.find('[data-test=passwort]').setValue('geheim1234')
    await wrapper.find('[data-test=passwortWiederholt]').setValue('geheim1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test=meldung]').text()).toBe('Der Name ist schon vergeben.')
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.find('[data-test=absenden]').attributes('disabled')).toBeUndefined()
  })

  it('zeigt Feldfehler des Servers am passenden Feld', async () => {
    fetchAttrappe(async () =>
      Response.json(
        {
          fehler: {
            code: 'VALIDIERUNG',
            nachricht: 'Eingabe ungültig.',
            details: [{ feld: 'name', problem: 'Fehler vom Server' }],
          },
        },
        { status: 400 },
      ),
    )
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=name]').setValue('nudl')
    await wrapper.find('[data-test=passwort]').setValue('geheim1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Fehler vom Server')
    expect(wrapper.find('[data-test=meldung]').exists()).toBe(false)
  })

  it('zeigt eine Meldung, wenn der Server nicht erreichbar ist', async () => {
    fetchAttrappe(async () => {
      throw new TypeError('Failed to fetch')
    })
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=name]').setValue('nudl')
    await wrapper.find('[data-test=passwort]').setValue('geheim1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test=meldung]').text()).toBe('Der Server ist nicht erreichbar.')
  })
})
