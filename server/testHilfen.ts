/** Gibt dem Test einen Dateipfad in einem eigenen leeren Ordner und räumt danach auf */
export async function mitTempOrdner(test: (pfad: string) => Promise<void>) {
  const ordner = await Deno.makeTempDir()
  try {
    await test(`${ordner}/nutzer.json`)
  } finally {
    await Deno.remove(ordner, { recursive: true })
  }
}

/** Zufallszahlen aus einem festen Startwert (mulberry32): gleicher Startwert, gleiche Folge */
export function festerZufall(startwert: number): () => number {
  let a = startwert
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
