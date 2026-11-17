/**
 * ZEIT-HELFER: Polling-Takt und Countdowns (Aufbau 3 min, Zugfrist 60 s, Code-Frist)
 * Reine Funktionen ohne Vue: leicht zu testen (countdown.spec.ts).
 * Der Server liefert Fristen als Zeitpunkt (z. B. aufbauEndeAm), nicht als Restsekunden.
 * Der Client rechnet die Restzeit selbst aus.
 */

/** Abstand der Abrufe beim Polling (ADR-012: alle 1 bis 2 Sekunden) */
export const POLL_MS = 1500

/**
 * Restzeit bis zu einem Zeitpunkt des Servers in ganzen Sekunden, nie negativ.
 * versatzMs gleicht eine falsch gehende Uhr im Browser aus: Serverzeit minus Browserzeit.
 * Beispiel: Browser geht 5 s nach => versatzMs = 5000, die Browserzeit wird korrigiert.
 * jetztMs kommt als Parameter herein (statt Date.now() hier), damit Tests eine feste Zeit nutzen.
 */
export function restSekunden(endeAm: string, versatzMs: number, jetztMs: number): number {
  const rest = Date.parse(endeAm) - (jetztMs + versatzMs) // Millisekunden bis zur Frist
  // ceil: 0,2 s Rest zeigt noch "1", erst bei 0 zeigt die Uhr 0:00. max(0, ...): nie negativ
  return Math.max(0, Math.ceil(rest / 1000))
}

/** Sekunden als m:ss, zum Beispiel 125 ergibt 2:05 */
export function zeitText(sekunden: number): string {
  const m = Math.floor(sekunden / 60)
  const s = sekunden % 60 // Rest der Division = Sekunden in der angefangenen Minute
  return `${m}:${String(s).padStart(2, '0')}` // padStart: 5 => "05"
}
