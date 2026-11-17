/**
 * ROUTER: ordnet jeder URL eine View zu und schützt Seiten vor Zugriff ohne Anmeldung (ADR-024)
 * Single Page Application: Der Browser lädt die Seite nur einmal. Danach tauscht der Router
 * beim Seitenwechsel nur die View in <RouterView /> aus (App.vue), ohne neuen Request für HTML.
 *
 * Routen:
 *   /             StartView (Anmelden/Registrieren), als einzige öffentlich
 *   /dashboard    DashboardView (Neues Spiel, laufendes Spiel, Statistik)
 *   /ergebnisse   ErgebnisseView (alle eigenen Spiele seitenweise)
 *   /spiel/:id    SpielView (Aufbau, Spielphase, Warteraum eines Duells)
 *   /turnier/:id  TurnierView (Warteraum und Übersicht eines Turniers)
 *   alles andere  zurück auf /
 */
import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import StartView from '@/views/StartView.vue'
import { nutzer, pruefen } from '@/anmeldung'

// Erweitert den Typ RouteMeta von vue-router um das eigene Feld "oeffentlich".
// So kennt TypeScript ziel.meta.oeffentlich im Guard unten (Declaration Merging).
declare module 'vue-router' {
  interface RouteMeta {
    /** Ohne Anmeldung erreichbar. Alle anderen Routen sind geschützt. */
    oeffentlich?: boolean
  }
}

/**
 * Baut den Router mit Guard. Tests übergeben eine History im Speicher.
 * Warum eine Funktion statt nur einem festen Router? Jeder Test bekommt einen frischen Router
 * (createMemoryHistory). So beeinflussen sich die Tests nicht gegenseitig.
 */
export function routerErstellen(history: RouterHistory) {
  const router = createRouter({
    history,
    routes: [
      // meta.oeffentlich: Nur diese Route ist ohne Anmeldung erreichbar ("geschützt als Standard")
      { path: '/', name: 'start', component: StartView, meta: { oeffentlich: true } },
      {
        path: '/dashboard',
        name: 'dashboard',
        // Lazy Loading: Die View lädt erst beim ersten Aufruf (eigene Datei im Build)
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
      {
        path: '/turnier/:id',
        name: 'turnier',
        component: () => import('@/views/TurnierView.vue'),
        props: true,
      },
      // Auffangroute: Jede unbekannte URL (z. B. /quatsch) führt zur Startseite
      { path: '/:pfad(.*)*', redirect: '/' },
    ],
  })

  // Liegt in der Funktion, damit jeder Router (auch im Test) einmal selbst fragt
  let geprueft = false

  /**
   * NAVIGATION GUARD: läuft vor jedem Seitenwechsel, auch beim ersten Laden der Seite.
   * Rückgabe '/...' = umleiten, Rückgabe undefined (nichts) = Wechsel erlauben.
   */
  router.beforeEach(async (ziel) => {
    // Nach dem Laden der Seite einmal fragen, ob das Cookie noch eine Session hat
    // (z. B. nach F5: nutzer ist dann wieder null, das Cookie existiert aber noch)
    if (!geprueft) {
      try {
        await pruefen()
        geprueft = true
      } catch {
        // Server nicht erreichbar => als abgemeldet behandeln, beim nächsten Wechsel erneut fragen
      }
    }
    // Geschützte Seite ohne Anmeldung => zur Startseite
    if (!ziel.meta.oeffentlich && !nutzer.value) return '/'
    // Angemeldet auf der Startseite => gleich ins Dashboard (kein zweites Login-Formular)
    if (ziel.name === 'start' && nutzer.value) return '/dashboard'
  })

  return router
}

// Der echte Router der App: createWebHistory nutzt echte URLs wie /dashboard (ohne #)
export default routerErstellen(createWebHistory(import.meta.env.BASE_URL))
