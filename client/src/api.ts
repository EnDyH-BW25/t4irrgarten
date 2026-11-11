import type { Fehler, FehlerCode } from '@shared/types.ts'

/** Fehler aus einem API-Aufruf. NETZWERK heißt: Der Server antwortet nicht. */
export class ApiFehler extends Error {
  constructor(
    public readonly status: number,
    public readonly code: FehlerCode | 'NETZWERK',
    nachricht: string,
    public readonly fehler: Fehler['fehler'] | null = null,
  ) {
    super(nachricht)
    this.name = 'ApiFehler'
  }
}

/** Ruft /api + pfad auf. Liefert die Daten oder wirft einen ApiFehler. */
async function api<T>(pfad: string, optionen: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${pfad}`, {
      headers: { 'Content-Type': 'application/json' },
      ...optionen,
    })
  } catch {
    throw new ApiFehler(0, 'NETZWERK', 'Der Server ist nicht erreichbar.')
  }

  if (res.status === 204) return undefined as T
  const daten: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const f = (daten as Fehler | null)?.fehler
    // 502-504 ohne unser Fehlerformat kommen vom Proxy: Der Server dahinter läuft nicht
    if (!f && res.status >= 502 && res.status <= 504) {
      throw new ApiFehler(res.status, 'NETZWERK', 'Der Server ist nicht erreichbar.')
    }
    throw new ApiFehler(
      res.status,
      f?.code ?? 'INTERN',
      f?.nachricht ?? 'Unbekannter Fehler.',
      f ?? null,
    )
  }
  return daten as T
}

export const get = <T>(pfad: string) => api<T>(pfad)

export const post = <T>(pfad: string, daten?: unknown) =>
  api<T>(pfad, { method: 'POST', body: JSON.stringify(daten ?? {}) })

export const put = <T>(pfad: string, daten: unknown) =>
  api<T>(pfad, { method: 'PUT', body: JSON.stringify(daten) })
