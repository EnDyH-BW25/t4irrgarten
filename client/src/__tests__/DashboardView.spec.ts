import type { Ergebnis, Nutzer } from '@shared/types.ts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { nutzer } from '../anmeldung'
import { beispielMatch, nichtErreichbar, serverAttrappe } from './hilfen'

/** Leere Statistik und Liste; Tests, die Ergebnisse prüfen, überschreiben die URLs */
const OHNE_ERGEBNISSE = {
  '/api/results/stats': () => Response.json({ siege: 0, niederlagen: 0, quote: 0 }),
  '/api/results?limit=10&offset=0': () => Response.json([]),
}

/** Server-Attrappe für das Dashboard; ergänzt die Ergebnis-URLs, die jedes Laden abruft */
function dashboardServer(antworten: Record<string, () => Response>) {
  return serverAttrappe({ ...OHNE_ERGEBNISSE, ...antworten })
}

const NUDL: Nutzer = { id: 'id-1', name: 'nudl', schwierigkeit: 'schwer' }

const keinMatch = () =>
  Response.json({ fehler: { code: 'NICHT_GEFUNDEN', nachricht: 'Kein Match.' } }, { status: 404 })
const konflikt = () =>
  Response.json({ fehler: { code: 'KONFLIKT', nachricht: 'Du spielst bereits.' } }, { status: 409 })

/** Dashboard mit eigenem Router; wartet, bis das offene Match geladen ist */
async function aufbauen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', component: DashboardView },
      { path: '/spiel/:id', component: { template: '<p>Spiel</p>' } },
    ],
  })
  router.push('/dashboard')
  await router.isReady()
  const wrapper = mount(DashboardView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  nutzer.value = { ...NUDL }
})
afterEach(() => vi.unstubAllGlobals())

describe('DashboardView', () => {
  it('wählt die zuletzt gespielte Schwierigkeit aus dem Account vor', async () => {
    dashboardServer({ '/api/matches/current': keinMatch })
    const { wrapper } = await aufbauen()
    const select = wrapper.find<HTMLSelectElement>('[data-test=schwierigkeit]')
    expect(select.element.value).toBe('schwer')
  })

  it('Neues Spiel zeigt die Auswahl, Live-Gegner zeigt Erstellen und Beitreten', async () => {
    dashboardServer({ '/api/matches/current': keinMatch })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=computer-gegner]').exists()).toBe(false)

    await wrapper.find('[data-test=neues-spiel]').trigger('click')
    expect(wrapper.find('[data-test=computer-gegner]').exists()).toBe(true)
    expect(wrapper.find('[data-test=duell-erstellen]').exists()).toBe(false)

    await wrapper.find('[data-test=live-gegner]').trigger('click')
    expect(wrapper.find('[data-test=duell-erstellen]').exists()).toBe(true)
    expect(wrapper.find('[data-test=duell-beitreten]').exists()).toBe(true)
  })

  it('Computer-Gegner legt das Match mit der gewählten Schwierigkeit an und öffnet das Spiel', async () => {
    const attrappe = dashboardServer({
      '/api/matches/current': keinMatch,
      '/api/matches': () => Response.json(beispielMatch({ id: 'neu' }), { status: 201 }),
    })
    const { wrapper, router } = await aufbauen()
    await wrapper.find('[data-test=schwierigkeit]').setValue('einfach')
    await wrapper.find('[data-test=neues-spiel]').trigger('click')
    await wrapper.find('[data-test=computer-gegner]').trigger('click')
    await flushPromises()

    const anlegen = attrappe.mock.calls.find(([url]) => url === '/api/matches')!
    expect(JSON.parse(anlegen[1]?.body as string)).toEqual({
      modus: 'computer',
      schwierigkeit: 'einfach',
    })
    expect(router.currentRoute.value.path).toBe('/spiel/neu')
    // Die Wahl gilt jetzt als zuletzt gespielt
    expect(nutzer.value?.schwierigkeit).toBe('einfach')
  })

  it('zeigt ein offenes Match mit Fortsetzen statt Neues Spiel', async () => {
    dashboardServer({ '/api/matches/current': () => Response.json(beispielMatch()) })
    const { wrapper, router } = await aufbauen()
    expect(wrapper.find('[data-test=neues-spiel]').exists()).toBe(false)
    expect(wrapper.find('[data-test=laufend]').text()).toContain('Aufbau')

    await wrapper.find('[data-test=fortsetzen]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/spiel/match-1')
  })

  it('Aufgeben beendet das offene Match, gibt Neues Spiel frei und lädt die Statistik neu', async () => {
    let aufgegeben = false
    dashboardServer({
      '/api/matches/current': () => (aufgegeben ? keinMatch() : Response.json(beispielMatch())),
      '/api/matches/match-1/resign': () => {
        aufgegeben = true
        return Response.json(beispielMatch({ status: 'beendet' }))
      },
      '/api/results/stats': () =>
        Response.json({ siege: 0, niederlagen: aufgegeben ? 1 : 0, quote: 0 }),
    })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=niederlagen]').text()).toBe('0')
    await wrapper.find('[data-test=aufgeben]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test=neues-spiel]').exists()).toBe(true)
    expect(wrapper.find('[data-test=niederlagen]').text()).toBe('1')
  })

  it('409 beim Anlegen lädt das offene Match nach, statt einen Fehler zu zeigen', async () => {
    let aufrufe = 0
    dashboardServer({
      // Erst kein Match, nach dem 409 (anderer Tab) gibt es eins
      '/api/matches/current': () =>
        aufrufe++ === 0 ? keinMatch() : Response.json(beispielMatch()),
      '/api/matches': konflikt,
    })
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=neues-spiel]').trigger('click')
    await wrapper.find('[data-test=computer-gegner]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test=laufend]').exists()).toBe(true)
    expect(wrapper.find('[data-test=meldung]').exists()).toBe(false)
  })

  it('zeigt eine Meldung, wenn der Server nicht erreichbar ist', async () => {
    dashboardServer({ '/api/matches/current': nichtErreichbar })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=meldung]').text()).toContain('nicht erreichbar')
  })

  describe('Live-Gegner', () => {
    /** Öffnet Neues Spiel und Live-Gegner */
    async function liveOeffnen(wrapper: Awaited<ReturnType<typeof aufbauen>>['wrapper']) {
      await wrapper.find('[data-test=neues-spiel]').trigger('click')
      await wrapper.find('[data-test=live-gegner]').trigger('click')
    }

    it('Spiel erstellen legt ein Duell an und öffnet den Warteraum', async () => {
      const attrappe = dashboardServer({
        '/api/matches/current': keinMatch,
        '/api/matches': () =>
          Response.json(beispielMatch({ id: 'duell', status: 'wartet', code: 'K7M2P' }), {
            status: 201,
          }),
      })
      const { wrapper, router } = await aufbauen()
      await liveOeffnen(wrapper)
      await wrapper.find('[data-test=duell-erstellen]').trigger('click')
      await flushPromises()

      const anlegen = attrappe.mock.calls.find(([url]) => url === '/api/matches')!
      expect(JSON.parse(anlegen[1]?.body as string)).toEqual({ modus: 'duell' })
      expect(router.currentRoute.value.path).toBe('/spiel/duell')
    })

    it('Beitreten ist erst bei fünf Zeichen aktiv und schickt den Code', async () => {
      const attrappe = dashboardServer({
        '/api/matches/current': keinMatch,
        '/api/matches/join': () => Response.json(beispielMatch({ id: 'duell', modus: 'duell' })),
      })
      const { wrapper, router } = await aufbauen()
      await liveOeffnen(wrapper)
      await wrapper.find('[data-test=duell-beitreten]').trigger('click')

      const senden = wrapper.find('[data-test=code-senden]')
      await wrapper.find('[data-test=code]').setValue('k7m2')
      expect(senden.attributes('disabled')).toBeDefined()
      await wrapper.find('[data-test=code]').setValue('k7m2p')
      expect(senden.attributes('disabled')).toBeUndefined()

      await wrapper.find('form').trigger('submit')
      await flushPromises()
      const beitritt = attrappe.mock.calls.find(([url]) => url === '/api/matches/join')!
      expect(JSON.parse(beitritt[1]?.body as string)).toEqual({ code: 'k7m2p' })
      expect(router.currentRoute.value.path).toBe('/spiel/duell')
    })

    it('ungültiger Code zeigt die Meldung des Servers', async () => {
      dashboardServer({
        '/api/matches/current': keinMatch,
        '/api/matches/join': () =>
          Response.json(
            {
              fehler: {
                code: 'CODE_UNGUELTIG',
                nachricht: 'Der Spielcode ist ungültig oder abgelaufen.',
              },
            },
            { status: 404 },
          ),
      })
      const { wrapper, router } = await aufbauen()
      await liveOeffnen(wrapper)
      await wrapper.find('[data-test=duell-beitreten]').trigger('click')
      await wrapper.find('[data-test=code]').setValue('ZZZZZ')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('[data-test=meldung]').text()).toContain('ungültig oder abgelaufen')
      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('ein wartendes Duell erscheint als Warteraum mit Abbrechen', async () => {
      dashboardServer({
        '/api/matches/current': () =>
          Response.json(beispielMatch({ modus: 'duell', status: 'wartet', code: 'K7M2P' })),
      })
      const { wrapper } = await aufbauen()
      expect(wrapper.find('[data-test=laufend]').text()).toContain('Duell im Warteraum')
      expect(wrapper.find('[data-test=aufgeben]').text()).toBe('Abbrechen')
    })

    it('ein laufendes Duell nennt den Namen des Gegners', async () => {
      dashboardServer({
        '/api/matches/current': () =>
          Response.json(
            beispielMatch({
              modus: 'duell',
              spieler: [
                { id: 'id-1', name: 'nudl', istComputer: false, anfragen: 0 },
                { id: 'id-2', name: 'Knödel', istComputer: false, anfragen: 0 },
              ],
            }),
          ),
      })
      const { wrapper } = await aufbauen()
      expect(wrapper.find('[data-test=laufend]').text()).toContain('Gegen Knödel')
    })
  })

  describe('Statistik und letzte Spiele', () => {
    const SPIELE: Ergebnis[] = [
      {
        id: 'e1',
        matchId: 'm1',
        competitionId: null,
        runde: null,
        platzierung: null,
        modus: 'duell',
        schwierigkeit: null,
        gegner: 'anna',
        ausgang: 'niederlage',
        endegrund: 'schatz',
        anfragen: 14,
        beendetAm: '2026-11-16T10:00:00.000Z',
      },
      {
        id: 'e2',
        matchId: 'm2',
        competitionId: null,
        runde: null,
        platzierung: null,
        modus: 'computer',
        schwierigkeit: 'schwer',
        gegner: 'Computer',
        ausgang: 'sieg',
        endegrund: 'schatz',
        anfragen: 9,
        beendetAm: '2026-11-15T10:00:00.000Z',
      },
    ]

    it('zeigt Siege, Niederlagen, Quote und die letzten Spiele', async () => {
      dashboardServer({
        '/api/matches/current': keinMatch,
        '/api/results/stats': () => Response.json({ siege: 2, niederlagen: 1, quote: 2 / 3 }),
        '/api/results?limit=10&offset=0': () => Response.json(SPIELE),
      })
      const { wrapper } = await aufbauen()
      expect(wrapper.find('[data-test=siege]').text()).toBe('2')
      expect(wrapper.find('[data-test=niederlagen]').text()).toBe('1')
      expect(wrapper.find('[data-test=quote]').text()).toBe('67 %')
      const zeilen = wrapper.findAll('[data-test=letztes-spiel]')
      expect(zeilen).toHaveLength(2)
      expect(zeilen[0]!.text()).toContain('anna')
      expect(zeilen[0]!.text()).toContain('Niederlage')
      expect(zeilen[1]!.text()).toContain('Computer (Schwer)')
      expect(zeilen[1]!.text()).toContain('Sieg')
    })

    it('ohne Spiele steht ein Hinweis statt einer leeren Liste', async () => {
      dashboardServer({ '/api/matches/current': keinMatch })
      const { wrapper } = await aufbauen()
      expect(wrapper.find('[data-test=keine-spiele]').exists()).toBe(true)
      expect(wrapper.find('[data-test=quote]').text()).toBe('0 %')
    })

    it('fragt die Statistik erst nach dem offenen Match ab', async () => {
      const attrappe = dashboardServer({ '/api/matches/current': keinMatch })
      await aufbauen()
      const urls = attrappe.mock.calls.map(([url]) => String(url))
      expect(urls[0]).toBe('/api/matches/current')
      expect(urls.slice(1).sort()).toEqual(['/api/results/stats', '/api/results?limit=10&offset=0'])
    })
  })
})
