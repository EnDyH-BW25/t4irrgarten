/** Eine JSON-Datei, die der Server nacheinander und nie halb fertig schreibt */
export class JsonDatei<T> {
  private schreibvorgang: Promise<void> = Promise.resolve()

  constructor(private readonly pfad: string) {}

  /** Liest die Datei; fehlt sie, gilt der Wert leer */
  async lesen(leer: T): Promise<T> {
    try {
      return JSON.parse(await Deno.readTextFile(this.pfad))
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return leer
      throw err
    }
  }

  /**
   * Schreibt über eine temporäre Datei und benennt sie danach um. Mehrere Aufrufe laufen
   * nacheinander. Der Inhalt wird erst beim Schreiben gelesen, also immer der neueste Stand.
   */
  schreiben(daten: T): Promise<void> {
    this.schreibvorgang = this.schreibvorgang
      .catch(() => {}) // ein früherer Fehler soll spätere Schreibvorgänge nicht blockieren
      .then(async () => {
        const tmp = `${this.pfad}.tmp`
        await Deno.writeTextFile(tmp, JSON.stringify(daten, null, 2))
        await Deno.rename(tmp, this.pfad)
      })
    return this.schreibvorgang
  }
}
