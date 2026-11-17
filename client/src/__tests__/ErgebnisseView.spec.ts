import type { Ergebnis } from '@shared/types.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ErgebnisseView from '../views/ErgebnisseView.vue'
import { nichtErreichbar, serverAttrappe } from './hilfen'

/** n Ergebnisse ab Nummer start; jedes zweite gegen den Computer */
function ergebnisse(start: number, n: number): Ergebnis[] {
  return Array.from({ length: n }, (_, i) => {
    const nr = start + i
    const computer = nr % 2 === 0
    return {
      id: `e${nr}`,
      matchId: `m${nr}`,
      competitionId: null,
      runde: null,
      platzierung: null,
      modus: computer ? 'computer' : 'duell',
      schwierigkeit: computer ? 'einfach' : null,
      gegner: computer ? 'Computer' : 'anna',
      ausgang: 'sieg',
      endegrund: computer ? 'schatz' : 'aufgabe',
      anfragen: 10 + nr,
      beendetAm: '2026-11-16T10:00:00.000Z',
    }
  })
}

async function aufbauen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ergebnisse', component: ErgebnisseView },
      { path: '/dashboard', component: { template: '<p>Dashboard</p>' } },
    ],
  })
  router.push('/ergebnisse')
  await router.isReady()
  const wrapper = mount(ErgebnisseView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

afterEach(() => vi.unstubAllGlobals())

describe('ErgebnisseView', () => {
  it('zeigt Details: beim Computer mit Schwierigkeit, im Duell ohne', async () => {
    serverAttrappe({ '/api/results?limit=20&offset=0': () => Response.json(ergebnisse(0, 2)) })
    const { wrapper } = await aufbauen()
    const details = wrapper.findAll('[data-test=details]')
    expect(details).toHaveLength(2)
    expect(details[0]!.text()).toContain('Einfach')
    expect(details[0]!.text()).toContain('Schatz gefunden')
    expect(details[0]!.text()).toContain('10')
    expect(details[1]!.text()).not.toContain('Schwierigkeit')
    expect(details[1]!.text()).toContain('anna')
    expect(details[1]!.text()).toContain('Aufgegeben')
  })

  it('Mehr laden holt die nächste Seite und verschwindet, wenn nichts mehr kommt', async () => {
    const attrappe = serverAttrappe({
      '/api/results?limit=20&offset=0': () => Response.json(ergebnisse(0, 20)),
      '/api/results?limit=20&offset=20': () => Response.json(ergebnisse(20, 3)),
    })
    const { wrapper } = await aufbauen()
    expect(wrapper.findAll('[data-test=ergebnis]')).toHaveLength(20)

    await wrapper.find('[data-test=mehr]').trigger('click')
    await flushPromises()
    expect(attrappe).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('[data-test=ergebnis]')).toHaveLength(23)
    expect(wrapper.find('[data-test=mehr]').exists()).toBe(false)
  })

  it('ohne Spiele steht ein Hinweis und kein Mehr-laden-Button', async () => {
    serverAttrappe({ '/api/results?limit=20&offset=0': () => Response.json([]) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=keine-spiele]').exists()).toBe(true)
    expect(wrapper.find('[data-test=mehr]').exists()).toBe(false)
  })

  it('zeigt eine Meldung, wenn der Server nicht erreichbar ist', async () => {
    serverAttrappe({ '/api/results?limit=20&offset=0': nichtErreichbar })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=meldung]').text()).toContain('nicht erreichbar')
    expect(wrapper.find('[data-test=keine-spiele]').exists()).toBe(false)
  })
})
