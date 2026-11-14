import { afterEach, describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { routerErstellen } from '../router'
import { nichtAngemeldet, serverAttrappe } from './hilfen'

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('zeigt Kopfzeile und Startseite mit Anmeldeformular', async () => {
    serverAttrappe({ '/api/auth/me': nichtAngemeldet })
    const router = routerErstellen(createMemoryHistory())
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Irrgarten')
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
