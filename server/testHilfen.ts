/**
 * TEST-HILFEN DES SERVERS (keine Tests selbst, Gegenstück zu client/src/__tests__/hilfen.ts)
 * Zwei Werkzeuge, damit Tests unabhängig und wiederholbar sind:
 * 1. mitTempOrdner: echte Dateien schreiben, ohne data/ zu berühren
 * 2. festerZufall: "Zufall", der bei jedem Lauf gleich ist
 */

/**
 * Gibt dem Test einen Dateipfad in einem eigenen leeren Ordner und räumt danach auf
 * Nutzung: await mitTempOrdner(async (pfad) => { ...NutzerSpeicher.laden(pfad)... })
 * finally: Der Ordner verschwindet auch dann, wenn der Test scheitert.
 */
export async function mitTempOrdner(test: (pfad: string) => Promise<void>) {
  const ordner = await Deno.makeTempDir() // z. B. /tmp/abc123, vom Betriebssystem
  try {
    await test(`${ordner}/nutzer.json`)
  } finally {
    await Deno.remove(ordner, { recursive: true })
  }
}

/**
 * Zufallszahlen aus einem festen Startwert (mulberry32): gleicher Startwert, gleiche Folge
 * Pseudozufall: sieht zufällig aus, ist aber berechnet. Generator und Sucher bekommen ihn
 * statt Math.random. So erzeugt festerZufall(7) in jedem Testlauf dasselbe Labyrinth.
 * Die Bit-Operationen im Inneren muss man nicht erklären können: bekannter Algorithmus,
 * Ergebnis liegt wie bei Math.random zwischen 0 und unter 1.
 * Falle aus Phase 7: () => 0 als "Zufall" machte jeden Spielcode zu AAAAA. Die Suche nach
 * einem freien Code lief dann endlos. Darum festerZufall statt einer festen Zahl.
 */
export function festerZufall(startwert: number): () => number {
  let a = startwert
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
