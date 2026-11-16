/** Abstand der Abrufe beim Polling (ADR-012: alle 1 bis 2 Sekunden) */
export const POLL_MS = 1500

/** Pause zwischen zwei Anfragen des Computers, damit man seinen Weg verfolgen kann */
export const ZUG_PAUSE_MS = 700

/**
 * Restzeit bis zu einem Zeitpunkt des Servers in ganzen Sekunden, nie negativ.
 * versatzMs gleicht eine falsch gehende Uhr im Browser aus: Serverzeit minus Browserzeit.
 */
export function restSekunden(endeAm: string, versatzMs: number, jetztMs: number): number {
  const rest = Date.parse(endeAm) - (jetztMs + versatzMs)
  return Math.max(0, Math.ceil(rest / 1000))
}

/** Sekunden als m:ss, zum Beispiel 125 ergibt 2:05 */
export function zeitText(sekunden: number): string {
  const m = Math.floor(sekunden / 60)
  const s = sekunden % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
