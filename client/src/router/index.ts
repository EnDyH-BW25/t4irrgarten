import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import StartView from '@/views/StartView.vue'
import { nutzer, pruefen } from '@/anmeldung'

declare module 'vue-router' {
  interface RouteMeta {
    /** Ohne Anmeldung erreichbar. Alle anderen Routen sind geschützt. */
    oeffentlich?: boolean
  }
}

/** Baut den Router mit Guard. Tests übergeben eine History im Speicher. */
export function routerErstellen(history: RouterHistory) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'start', component: StartView, meta: { oeffentlich: true } },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: '/ergebnisse',
        name: 'ergebnisse',
        component: () => import('@/views/ErgebnisseView.vue'),
      },
      {
        // props: true gibt :id als Prop an die View, statt dass sie die Route selbst liest
        path: '/spiel/:id',
        name: 'spiel',
        component: () => import('@/views/SpielView.vue'),
        props: true,
      },
      { path: '/:pfad(.*)*', redirect: '/' },
    ],
  })

  // Liegt in der Funktion, damit jeder Router (auch im Test) einmal selbst fragt
  let geprueft = false

  router.beforeEach(async (ziel) => {
    // Nach dem Laden der Seite einmal fragen, ob das Cookie noch eine Session hat
    if (!geprueft) {
      try {
        await pruefen()
        geprueft = true
      } catch {
        // Server nicht erreichbar => als abgemeldet behandeln, beim nächsten Wechsel erneut fragen
      }
    }
    if (!ziel.meta.oeffentlich && !nutzer.value) return '/'
    if (ziel.name === 'start' && nutzer.value) return '/dashboard'
  })

  return router
}

export default routerErstellen(createWebHistory(import.meta.env.BASE_URL))
