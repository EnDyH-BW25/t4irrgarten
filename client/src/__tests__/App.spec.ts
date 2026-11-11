import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('zeigt Kopfzeile und Startseite', async () => {
    // Die Startseite fragt /api/health ab. Im Test antwortet eine Attrappe.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ status: 'ok', serverZeit: '2026-01-01T00:00:00Z' })),
    )

    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Irrgarten')
    expect(wrapper.text()).toContain('Server erreichbar')

    vi.unstubAllGlobals()
  })
})
