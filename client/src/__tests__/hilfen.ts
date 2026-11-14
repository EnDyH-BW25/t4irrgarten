import { vi } from 'vitest'

/**
 * Ersetzt fetch durch eine Attrappe, die je nach URL antwortet.
 * Eine URL ohne Eintrag lässt den Test mit einer klaren Meldung scheitern.
 */
export function serverAttrappe(antworten: Record<string, () => Response>) {
  const attrappe = vi.fn<typeof fetch>(async (url) => {
    const antwort = antworten[String(url)]
    if (!antwort) throw new Error(`Keine Antwort für ${url} vorgesehen`)
    return antwort()
  })
  vi.stubGlobal('fetch', attrappe)
  return attrappe
}

export const nichtAngemeldet = () =>
  Response.json(
    { fehler: { code: 'NICHT_ANGEMELDET', nachricht: 'Bitte melde dich an.' } },
    { status: 401 },
  )

export const nichtErreichbar = (): Response => {
  throw new TypeError('Failed to fetch')
}
