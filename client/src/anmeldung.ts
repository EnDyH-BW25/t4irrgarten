import { ref } from 'vue'
import type { Nutzer } from '@shared/types.ts'
import { ApiFehler, get, post } from '@/api'

/** Angemeldeter Nutzer oder null => Alle Komponenten teilen sich diesen Wert */
export const nutzer = ref<Nutzer | null>(null)

// Kein try/catch: Der ApiFehler fliegt unverändert bis zum Formular.
// Nur das Formular weiß, wo es Meldung und Feldfehler anzeigt.
export async function anmelden(name: string, passwort: string): Promise<void> {
  nutzer.value = await post<Nutzer>('/auth/login', { name, passwort })
}

export async function registrieren(name: string, passwort: string): Promise<void> {
  nutzer.value = await post<Nutzer>('/auth/register', { name, passwort })
}

export async function abmelden(): Promise<void> {
  try {
    await post('/auth/logout')
  } catch (e) {
    // 401 => Session war schon weg, das Ziel "abgemeldet" ist trotzdem erreicht
    if (!(e instanceof ApiFehler && e.status === 401)) throw e
  }
  nutzer.value = null
}

/** Fragt den Server, ob noch eine Session besteht */
export async function pruefen(): Promise<void> {
  try {
    nutzer.value = await get<Nutzer>('/auth/me')
  } catch (e) {
    if (e instanceof ApiFehler && e.status === 401) {
      // Session abgelaufen oder nicht angemeldet => einfach null setzen
      nutzer.value = null
      return
    }
    throw e
  }
}
