/**
 * API-SCHICHT: die einzige Stelle, die fetch() aufruft
 * Alle anderen Dateien (anmeldung.ts, matches.ts, turniere.ts, ergebnisse.ts) nutzen nur
 * get/post/put/del/abfragen. Vorteil: Fehlerbehandlung und Basis-URL stehen an genau einer Stelle.
 * Jeder Fehler kommt als ApiFehler heraus, egal ob Server-Fehler oder kein Netz.
 */
import type { Fehler, FehlerCode } from '@shared/types.ts' // gemeinsame Typen mit dem Server

/** Fehler aus einem API-Aufruf. NETZWERK heißt: Der Server antwortet nicht. */
export class ApiFehler extends Error {
  // "public readonly" im Konstruktor legt automatisch ein Feld an (TypeScript-Kurzschreibweise)
  constructor(
    public readonly status: number, // HTTP-Status, 0 = gar keine Antwort
    public readonly code: FehlerCode | 'NETZWERK', // maschinenlesbar, z. B. 'VALIDIERUNG'
    nachricht: string, // Text für die Oberfläche, landet in e.message
    public readonly fehler: Fehler['fehler'] | null = null, // ganzes Fehlerobjekt inkl. details
  ) {
    super(nachricht)
    this.name = 'ApiFehler'
  }
}

/**
 * Ruft /api + pfad auf. Liefert die Daten oder wirft einen ApiFehler.
 * <T> ist ein Generic: Der Aufrufer sagt, welchen Typ er zurückerwartet, z. B. api<Match>(...).
 */
async function api<T>(pfad: string, optionen: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    // Relativer Pfad /api/...: Im Dev-Betrieb leitet der Vite-Proxy an den Deno-Server (Port 8000)
    res = await fetch(`/api${pfad}`, {
      headers: { 'Content-Type': 'application/json' },
      ...optionen, // Spread: method und body vom Aufrufer kommen dazu
    })
  } catch {
    // fetch wirft nur, wenn gar keine Antwort kommt (Server aus, WLAN weg)
    throw new ApiFehler(0, 'NETZWERK', 'Der Server ist nicht erreichbar.')
  }

  // 204 No Content: Erfolg ohne Inhalt (z. B. Turnier verlassen)
  if (res.status === 204) return undefined as T
  // 304 hat keinen Inhalt und heißt: nichts geändert. Nur abfragen() schickt since mit.
  if (res.status === 304) return null as T
  // .catch(() => null): Ein Body ohne gültiges JSON soll nicht abstürzen
  const daten: unknown = await res.json().catch(() => null)

  // res.ok ist true bei Status 200-299
  if (!res.ok) {
    const f = (daten as Fehler | null)?.fehler // ?. = nur weiterlesen, wenn nicht null
    // 502-504 ohne unser Fehlerformat kommen vom Proxy: Der Server dahinter läuft nicht
    if (!f && res.status >= 502 && res.status <= 504) {
      throw new ApiFehler(res.status, 'NETZWERK', 'Der Server ist nicht erreichbar.')
    }
    // ?? = Ersatzwert, falls links null/undefined steht
    throw new ApiFehler(
      res.status,
      f?.code ?? 'INTERN',
      f?.nachricht ?? 'Unbekannter Fehler.',
      f ?? null,
    )
  }
  return daten as T
}

// Kurze Helfer je HTTP-Methode. Sie setzen nur method und body und rufen dann api() auf.
export const get = <T>(pfad: string) => api<T>(pfad)

/**
 * Für Polling: hängt die letzte bekannte Version als since an.
 * Liefert null, wenn sich seitdem nichts geändert hat (304).
 * So schickt der Server nur dann ein ganzes Match, wenn es wirklich neu ist (ADR-012/019).
 */
export const abfragen = <T>(pfad: string, since?: number) =>
  api<T | null>(since === undefined ? pfad : `${pfad}?since=${since}`)

// JSON.stringify macht aus dem Objekt den Text für den Request-Body
export const post = <T>(pfad: string, daten?: unknown) =>
  api<T>(pfad, { method: 'POST', body: JSON.stringify(daten ?? {}) })

export const put = <T>(pfad: string, daten: unknown) =>
  api<T>(pfad, { method: 'PUT', body: JSON.stringify(daten) })

export const del = <T>(pfad: string) => api<T>(pfad, { method: 'DELETE' })
