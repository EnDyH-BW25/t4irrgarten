/**
 * ANMELDEZUSTAND DES CLIENTS (ADR-024)
 * Hält den angemeldeten Nutzer und bietet anmelden/registrieren/abmelden/pruefen an.
 * Die eigentliche Session liegt als HttpOnly-Cookie im Browser. JavaScript sieht das Cookie
 * nicht. Darum fragt der Client den Server mit /auth/me, ob er noch angemeldet ist.
 * Nutzer: StartView (Formular), App.vue (Kopfzeile), Router-Guard, Dashboard.
 */
import { ref } from 'vue'
import type { Nutzer } from '@shared/types.ts'
import { ApiFehler, get, post } from '@/api'

/**
 * Angemeldeter Nutzer oder null => Alle Komponenten teilen sich diesen Wert
 * ref() macht den Wert reaktiv: Ändert er sich, zeichnet Vue jede Stelle neu, die ihn anzeigt.
 * Weil er auf Modulebene steht, existiert er nur einmal (einfacher globaler Zustand ohne Pinia).
 */
export const nutzer = ref<Nutzer | null>(null)

/**
 * Alle Tabs eines Browsers teilen sich das Session-Cookie. Meldet sich ein Tab mit einem anderen
 * Account an, spricht jeder andere Tab ab sofort als dieser Account mit dem Server. Darum melden
 * die Tabs jeden Wechsel. Ein Tab mit einem anderen Account lädt neu und zeigt den echten Stand.
 * BroadcastChannel = Browser-API, über die Tabs derselben Seite Nachrichten austauschen (ADR-039).
 * Die Prüfung auf undefined schützt Umgebungen ohne diese API (z. B. ältere Testumgebungen).
 */
const kanal =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('irrgarten-anmeldung')

// Ein anderer Tab meldet eine Nutzer-ID. Weicht sie von meiner ab: zurück zur Startseite, neu laden.
kanal?.addEventListener('message', (e: MessageEvent<string | null>) => {
  if (e.data !== (nutzer.value?.id ?? null)) window.location.assign('/')
})

/** Schickt die eigene Nutzer-ID (oder null nach dem Abmelden) an alle anderen Tabs */
function wechselMelden() {
  kanal?.postMessage(nutzer.value?.id ?? null)
}

// Kein try/catch: Der ApiFehler fliegt unverändert bis zum Formular.
// Nur das Formular weiß, wo es Meldung und Feldfehler anzeigt.
export async function anmelden(name: string, passwort: string): Promise<void> {
  // Der Server setzt dabei das Session-Cookie und antwortet mit dem Nutzer {id, name, ...}
  nutzer.value = await post<Nutzer>('/auth/login', { name, passwort })
  wechselMelden()
}

export async function registrieren(name: string, passwort: string): Promise<void> {
  nutzer.value = await post<Nutzer>('/auth/register', { name, passwort })
  wechselMelden()
}

export async function abmelden(): Promise<void> {
  try {
    await post('/auth/logout')
  } catch (e) {
    // 401 => Session war schon weg, das Ziel "abgemeldet" ist trotzdem erreicht
    if (!(e instanceof ApiFehler && e.status === 401)) throw e
  }
  nutzer.value = null
  wechselMelden()
}

/**
 * Fragt den Server, ob noch eine Session besteht
 * Aufruf durch den Router-Guard beim ersten Seitenaufruf (z. B. nach F5).
 */
export async function pruefen(): Promise<void> {
  try {
    nutzer.value = await get<Nutzer>('/auth/me')
  } catch (e) {
    if (e instanceof ApiFehler && e.status === 401) {
      // Session abgelaufen oder nicht angemeldet => einfach null setzen
      nutzer.value = null
      return
    }
    throw e // z. B. NETZWERK: Der Guard entscheidet, was dann passiert
  }
}
