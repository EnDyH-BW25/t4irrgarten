/** Gibt dem Test einen Dateipfad in einem eigenen leeren Ordner und räumt danach auf */
export async function mitTempOrdner(test: (pfad: string) => Promise<void>) {
  const ordner = await Deno.makeTempDir()
  try {
    await test(`${ordner}/nutzer.json`)
  } finally {
    await Deno.remove(ordner, { recursive: true })
  }
}
