import type { Match } from '@shared/types.ts'
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

describe('SpielView im Aufbau', () => {
  /** Antwort des Servers auf PUT: das Match mit dem gesendeten Entwurf und einer Prüfmeldung */
  const gespeichert = (body: string, meldung: string) =>
    Response.json(
      beispielMatch({
        meinLabyrinth: JSON.parse(body),
        pruefung: { loesbar: true, meldung, problematischeMauern: [] },
      }),
    )

  it('setzt eine Mauer sofort, speichert sie und zählt herunter', async () => {
    const attrappe = vi.fn<typeof fetch>(async (url, optionen) =>
      optionen?.method === 'PUT'
        ? gespeichert(optionen.body as string, 'Gespeichert')
        : Response.json(beispielMatch()),
    )
    vi.stubGlobal('fetch', attrappe)
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=rest-mauern]').text()).toContain('Noch 30')

    await wrapper.find('[data-test=mauer-A1_A2]').trigger('click')
    expect(wrapper.find('[data-test=mauer-A1_A2]').classes()).toContain('bg-orange-400')
    expect(wrapper.find('[data-test=rest-mauern]').text()).toContain('Noch 29')
    await flushPromises()

    const [url, optionen] = attrappe.mock.calls[1]!
    expect(url).toBe('/api/matches/match-1/labyrinth')
    expect(optionen?.method).toBe('PUT')
    expect(JSON.parse(optionen?.body as string)).toEqual({ schatz: null, mauern: ['A1_A2'] })
  })

  it('legt den Schatz per Klick, lehnt A1 aber ohne Anfrage ab', async () => {
    const attrappe = vi.fn<typeof fetch>(async (url, optionen) =>
      optionen?.method === 'PUT'
        ? gespeichert(optionen.body as string, 'Schatz erreichbar')
        : Response.json(beispielMatch()),
    )
    vi.stubGlobal('fetch', attrappe)
    const { wrapper } = await aufbauen()

    await wrapper.find('[data-test=zelle-A1]').trigger('click')
    expect(wrapper.find('[data-test=hinweis]').text()).toContain('A1')
    expect(attrappe).toHaveBeenCalledTimes(1) // nur das Laden

    await wrapper.find('[data-test=zelle-C4]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test=zelle-C4] [data-test=schatz]').exists()).toBe(true)
    expect(wrapper.find('[data-test=pruefung]').text()).toBe('Schatz erreichbar')
    expect(wrapper.find('[data-test=hinweis]').exists()).toBe(false)
  })

  it('verwirft eine ältere Antwort, die nach der neueren eintrifft', async () => {
    // Die Antworten auf PUT halten wir fest und geben sie in umgekehrter Reihenfolge frei
    const offen: (() => void)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((url, optionen) => {
        if (optionen?.method !== 'PUT') return Promise.resolve(Response.json(beispielMatch()))
        const nr = offen.length + 1
        return new Promise((fertig) =>
          offen.push(() => fertig(gespeichert(optionen.body as string, `Antwort ${nr}`))),
        )
      }),
    )
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=mauer-A1_A2]').trigger('click')
    await wrapper.find('[data-test=mauer-B2_B3]').trigger('click')

    offen[1]!() // Antwort auf Klick 2 kommt zuerst
    await flushPromises()
    offen[0]!() // Antwort auf Klick 1 kommt zu spät
    await flushPromises()

    expect(wrapper.find('[data-test=pruefung]').text()).toBe('Antwort 2')
    // Beide Mauern bleiben sichtbar, der lokale Entwurf ist führend
    expect(wrapper.find('[data-test=mauer-A1_A2]').classes()).toContain('bg-orange-400')
    expect(wrapper.find('[data-test=mauer-B2_B3]').classes()).toContain('bg-orange-400')
  })

  it('meldet einen Fehler beim Speichern und behält die Mauer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (url, optionen) => {
        if (optionen?.method === 'PUT') throw new TypeError('Failed to fetch')
        return Response.json(beispielMatch())
      }),
    )
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=mauer-A1_A2]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test=speicher-fehler]').text()).toContain('Nicht gespeichert')
    expect(wrapper.find('[data-test=mauer-A1_A2]').classes()).toContain('bg-orange-400')
  })

  it('sperrt das Feld, sobald das Labyrinth gesetzt ist', async () => {
    const gesetzt: Partial<Match> = {
      ich: { labyrinthGesetzt: true, startBestaetigt: false, nachbesserungEndeAm: null },
      meinLabyrinth: { schatz: 'F6', mauern: ['A1_A2'] },
    }
    serverAttrappe({ '/api/matches/match-1': () => Response.json(beispielMatch(gesetzt)) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=mauer-B2_B3]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test=rest-mauern]').exists()).toBe(false)
    expect(wrapper.find('[data-test=zelle-F6] [data-test=schatz]').exists()).toBe(true)
  })
})

describe('SpielView: Countdown, Prüfung und Setzen', () => {
  afterEach(() => vi.useRealTimers())

  it('zählt die Aufbauzeit herunter und gleicht die Browseruhr aus', async () => {
    // Nur Uhr und Intervall vortäuschen; setTimeout bleibt echt, sonst hängt flushPromises
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(Date.parse('2026-11-16T09:55:00.000Z')) // Browser geht 5 Minuten nach
    serverAttrappe({ '/api/matches/match-1': () => Response.json(beispielMatch()) })
    const { wrapper } = await aufbauen()
    expect(wrapper.find('[data-test=countdown]').text()).toBe('3:00')

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(wrapper.find('[data-test=countdown]').text()).toBe('2:58')
  })

  it('zeigt die Prüfung in drei Zuständen', async () => {
    const mitPruefung = (loesbar: boolean | null, meldung: string | null) =>
      beispielMatch({ pruefung: { loesbar, meldung, problematischeMauern: [] } })

    serverAttrappe({ '/api/matches/match-1': () => Response.json(mitPruefung(null, null)) })
    expect((await aufbauen()).wrapper.find('[data-test=pruefung]').text()).toContain(
      'Leg deinen Schatz',
    )

    serverAttrappe({
      '/api/matches/match-1': () => Response.json(mitPruefung(true, 'Schatz erreichbar')),
    })
    const gruen = (await aufbauen()).wrapper.find('[data-test=pruefung]')
    expect(gruen.classes()).toContain('bg-green-100')

    serverAttrappe({
      '/api/matches/match-1': () => Response.json(mitPruefung(false, 'Schatz nicht erreichbar')),
    })
    const rot = (await aufbauen()).wrapper.find('[data-test=pruefung]')
    expect(rot.classes()).toContain('bg-red-100')
    expect(rot.text()).toContain('rot markierten Mauern')
  })

  it('wartet beim Setzen auf die letzte Speicherung und startet dann das Spiel', async () => {
    const reihenfolge: string[] = []
    let putFertig: () => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((url, optionen) => {
        if (optionen?.method === 'PUT') {
          reihenfolge.push('PUT gestartet')
          return new Promise((fertig) => {
            putFertig = () => {
              reihenfolge.push('PUT fertig')
              fertig(Response.json(beispielMatch()))
            }
          })
        }
        if (String(url).endsWith('/place')) {
          reihenfolge.push('place')
          return Promise.resolve(
            Response.json(
              beispielMatch({
                status: 'laeuft',
                aufbauEndeAm: null,
                pruefung: null,
                ich: { labyrinthGesetzt: true, startBestaetigt: false, nachbesserungEndeAm: null },
              }),
            ),
          )
        }
        return Promise.resolve(Response.json(beispielMatch()))
      }),
    )
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=zelle-C4]').trigger('click')
    await wrapper.find('[data-test=setzen]').trigger('click')
    await flushPromises()
    expect(reihenfolge).toEqual(['PUT gestartet']) // place wartet noch

    putFertig()
    await flushPromises()
    expect(reihenfolge).toEqual(['PUT gestartet', 'PUT fertig', 'place'])
    expect(wrapper.find('[data-test=gesetzt]').exists()).toBe(true)
    expect(wrapper.find('[data-test=setzen]').exists()).toBe(false)
    expect(wrapper.find('[data-test=countdown]').exists()).toBe(false)
    expect(wrapper.find('[data-test=mauer-A1_A2]').attributes('disabled')).toBeDefined()
  })

  it('zeigt die Meldung des Servers, wenn der Schatz fehlt', async () => {
    serverAttrappe({
      '/api/matches/match-1': () => Response.json(beispielMatch()),
      '/api/matches/match-1/labyrinth/place': () =>
        Response.json(
          { fehler: { code: 'SCHATZ_FEHLT', nachricht: 'Platziere zuerst deinen Schatz.' } },
          { status: 422 },
        ),
    })
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=setzen]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test=setz-fehler]').text()).toBe('Platziere zuerst deinen Schatz.')
    expect(wrapper.find('[data-test=setzen]').exists()).toBe(true) // weiter bearbeitbar
  })

  it('setzt nicht, wenn auch der zweite Speicherversuch scheitert', async () => {
    const attrappe = vi.fn<typeof fetch>(async (url, optionen) => {
      if (optionen?.method === 'PUT') throw new TypeError('Failed to fetch')
      return Response.json(beispielMatch())
    })
    vi.stubGlobal('fetch', attrappe)
    const { wrapper } = await aufbauen()
    await wrapper.find('[data-test=zelle-C4]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test=setzen]').trigger('click')
    await flushPromises()
    const urls = attrappe.mock.calls.map(([url]) => String(url))
    expect(urls.some((u) => u.endsWith('/place'))).toBe(false)
    expect(wrapper.find('[data-test=speicher-fehler]').exists()).toBe(true)
  })
})
