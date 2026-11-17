import type { Nutzer, Paarung, Turnier } from '@shared/types.ts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import TurnierView from '../views/TurnierView.vue'
import { nutzer } from '../anmeldung'
import { beispielTurnier, serverAttrappe } from './hilfen'

const NUDL: Nutzer = { id: 'id-1', name: 'nudl', schwierigkeit: 'standard' }
const URL = '/api/competitions/turnier-1'

const spieler = (id: string, name: string, istComputer = false) => ({
  id,
  name,
  istComputer,
  anfragen: 0,
})
const NUDL_S = spieler('id-1', 'nudl')
const BEN = spieler('ben', 'Ben')
const CLARA = spieler('clara', 'Clara')
const COMPUTER = spieler('computer', 'Computer', true)

function paarung(teil: Partial<Paarung>): Paarung {
  return {
    matchId: 'm1',
    spielerA: NUDL_S,
    spielerB: BEN,
    status: 'beendet',
    siegerId: null,
    platzUm: [],
    ...teil,
  }
}

/** Laufendes Turnier mit beendeter Runde 1; nudl hat gerade kein Match */
function nachRunde1(aenderungen: Partial<Turnier> = {}): Turnier {
  return beispielTurnier({
    status: 'laeuft',
    code: null,
    codeEndeAm: null,
    teilnehmer: [NUDL_S, BEN, CLARA, COMPUTER],
    runden: [
      {
        nr: 1,
        matches: [
          paarung({ matchId: 'm1', siegerId: 'id-1' }),
          paarung({ matchId: 'm2', spielerA: CLARA, spielerB: COMPUTER, status: 'laeuft' }),
        ],
      },
    ],
    ...aenderungen,
  })
}

async function aufbauen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/turnier/:id', component: TurnierView, props: true },
      { path: '/dashboard', component: { template: '<p>Dashboard</p>' } },
      { path: '/spiel/:id', component: { template: '<p>Spiel</p>' } },
    ],
  })
  router.push('/turnier/turnier-1')
  await router.isReady()
  const wrapper = mount(TurnierView, { props: { id: 'turnier-1' }, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  nutzer.value = { ...NUDL }
})
afterEach(() => vi.unstubAllGlobals())
enableAutoUnmount(afterEach)

describe('TurnierView im Warteraum', () => {
  it('Host sieht Code, Countdown und Teilnehmer; Start erst ab drei Spielern', async () => {
    serverAttrappe({ [URL]: () => Response.json(beispielTurnier({ teilnehmer: [NUDL_S, BEN] })) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=code]').text()).toBe('H3R8W')
    expect(wrapper.find('[data-test=code-countdown]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test=teilnehmer] li')).toHaveLength(2)
    expect(wrapper.find('[data-test=turnier-starten]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test=verlassen]').text()).toBe('Turnier auflösen')
  })

  it('Turnier starten springt direkt in das eigene Match', async () => {
    const attrappe = serverAttrappe({
      [URL]: () => Response.json(beispielTurnier({ teilnehmer: [NUDL_S, BEN, CLARA] })),
      [`${URL}/start`]: () => Response.json(nachRunde1({ meinNaechstesMatchId: 'm1', runden: [] })),
    })
    const { wrapper, router } = await aufbauen()
    await wrapper.find('[data-test=turnier-starten]').trigger('click')
    await flushPromises()

    expect(attrappe.mock.calls.some(([url]) => url === `${URL}/start`)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/spiel/m1')
  })

  it('Teilnehmer sieht keinen Code und keinen Start, sondern den Hinweis', async () => {
    serverAttrappe({
      [URL]: () =>
        Response.json(
          beispielTurnier({
            hostId: 'ben',
            code: null,
            codeEndeAm: null,
            teilnehmer: [BEN, NUDL_S],
          }),
        ),
    })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=code]').exists()).toBe(false)
    expect(wrapper.find('[data-test=turnier-starten]').exists()).toBe(false)
    expect(wrapper.find('[data-test=warte-host]').exists()).toBe(true)
    expect(wrapper.find('[data-test=verlassen]').text()).toBe('Warteraum verlassen')
  })

  it('Verlassen schickt DELETE und führt zum Dashboard', async () => {
    const attrappe = serverAttrappe({
      [URL]: () => Response.json(beispielTurnier()),
      [`${URL}/participants/me`]: () => new Response(null, { status: 204 }),
    })
    const { wrapper, router } = await aufbauen()
    await wrapper.find('[data-test=verlassen]').trigger('click')
    await flushPromises()

    const aufruf = attrappe.mock.calls.find(([url]) => url === `${URL}/participants/me`)!
    expect(aufruf[1]?.method).toBe('DELETE')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })
})

describe('TurnierView im Turnier', () => {
  it('ohne eigenes Match: Wartebildschirm und Paarungen mit Stand', async () => {
    serverAttrappe({ [URL]: () => Response.json(nachRunde1()) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=wartebildschirm]').exists()).toBe(true)
    const paarungen = wrapper.findAll('[data-test=paarung]')
    expect(paarungen[0]!.text()).toContain('Sieger: nudl')
    expect(paarungen[1]!.text()).toContain('Clara gegen Computer')
    expect(paarungen[1]!.text()).toContain('Spiel läuft')
  })

  it('springt in das eigene Match, sobald es eines gibt', async () => {
    serverAttrappe({ [URL]: () => Response.json(nachRunde1({ meinNaechstesMatchId: 'm3' })) })
    const { router } = await aufbauen()
    expect(router.currentRoute.value.path).toBe('/spiel/m3')
  })

  it('am Ende: Runde 2 mit Finale und Platzierung', async () => {
    serverAttrappe({
      [URL]: () =>
        Response.json(
          nachRunde1({
            status: 'beendet',
            runden: [
              nachRunde1().runden[0]!,
              {
                nr: 2,
                matches: [
                  paarung({ matchId: 'm3', spielerB: COMPUTER, siegerId: 'id-1', platzUm: [1, 2] }),
                  paarung({
                    matchId: 'm4',
                    spielerA: BEN,
                    spielerB: CLARA,
                    siegerId: 'clara',
                    platzUm: [3, 4],
                  }),
                ],
              },
            ],
            platzierungen: [
              { platz: 1, spieler: NUDL_S },
              { platz: 2, spieler: COMPUTER },
              { platz: 3, spieler: CLARA },
              { platz: 4, spieler: BEN },
            ],
          }),
        ),
    })
    const { wrapper } = await aufbauen()
    const text = wrapper.text()
    expect(text).toContain('Finale (Platz 1 und 2)')
    expect(text).toContain('Spiel um Platz 3')
    const plaetze = wrapper.findAll('[data-test=platzierung] li').map((li) => li.text())
    expect(plaetze[0]).toContain('1. nudl')
    expect(plaetze[3]).toContain('4. Ben')
    expect(wrapper.find('[data-test=wartebildschirm]').exists()).toBe(false)
  })

  it('abgebrochen: Hinweis ohne Wertung', async () => {
    serverAttrappe({ [URL]: () => Response.json(nachRunde1({ status: 'abgebrochen' })) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=abgebrochen]').exists()).toBe(true)
    expect(wrapper.find('[data-test=platzierung]').exists()).toBe(false)
  })
})
