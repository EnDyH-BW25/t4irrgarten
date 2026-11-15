import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SpielView from '../views/SpielView.vue'
import { beispielMatch, serverAttrappe } from './hilfen'

async function aufbauen(id = 'match-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/spiel/:id', component: SpielView, props: true },
      { path: '/dashboard', component: { template: '<p>Dashboard</p>' } },
    ],
  })
  router.push(`/spiel/${id}`)
  await router.isReady()
  const wrapper = mount(SpielView, { props: { id }, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

afterEach(() => vi.unstubAllGlobals())

describe('SpielView', () => {
  it('lädt das Match zur Id aus der URL und zeigt Status und Schwierigkeit', async () => {
    serverAttrappe({ '/api/matches/match-1': () => Response.json(beispielMatch()) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=status]').text()).toContain('Aufbau')
    expect(wrapper.find('[data-test=status]').text()).toContain('Standard')
  })

  it('zeigt bei fremdem oder unbekanntem Match die Meldung des Servers', async () => {
    serverAttrappe({
      '/api/matches/fremd': () =>
        Response.json(
          { fehler: { code: 'VERBOTEN', nachricht: 'Du spielst in diesem Match nicht mit.' } },
          { status: 403 },
        ),
    })
    const { wrapper } = await aufbauen('fremd')
    expect(wrapper.find('[data-test=meldung]').text()).toContain('nicht mit')
  })

  it('Aufgeben führt zurück zum Dashboard', async () => {
    serverAttrappe({
      '/api/matches/match-1': () => Response.json(beispielMatch()),
      '/api/matches/match-1/resign': () => Response.json(beispielMatch({ status: 'beendet' })),
    })
    const { wrapper, router } = await aufbauen()
    await wrapper.find('[data-test=aufgeben]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('bietet kein Aufgeben mehr an, wenn das Spiel vorbei ist', async () => {
    serverAttrappe({
      '/api/matches/match-1': () => Response.json(beispielMatch({ status: 'beendet' })),
    })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=aufgeben]').exists()).toBe(false)
  })
})
