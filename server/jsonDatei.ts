/**
 * JSON-DATEI ALS EINFACHE DATENBANK (genutzt von NutzerSpeicher und ErgebnisSpeicher)
 * Keine echte Datenbank, weil das Projekt klein ist (ADR-023, ADR-029).
 * Zwei Schutzmechanismen:
 * 1. Atomares Schreiben: erst in datei.tmp, dann umbenennen. Ein Absturz mitten im Schreiben
 *    hinterlässt so nie eine halbe, kaputte Datei.
 * 2. Warteschlange: Schreibvorgänge laufen nacheinander, nie gleichzeitig.
 * <T> = Generic: dieselbe Klasse für Nutzer-Listen und Ergebnis-Listen.
 */

/** Eine JSON-Datei, die der Server nacheinander und nie halb fertig schreibt */
export class JsonDatei<T> {
  // Das Ende der Warteschlange: der zuletzt angehängte Schreibvorgang
  private schreibvorgang: Promise<void> = Promise.resolve()

  constructor(private readonly pfad: string) {}

  /** Liest die Datei; fehlt sie, gilt der Wert leer (z. B. beim allerersten Start) */
  async lesen(leer: T): Promise<T> {
    try {
      return JSON.parse(await Deno.readTextFile(this.pfad))
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return leer
      throw err // andere Fehler (kaputtes JSON, keine Rechte) nicht verschlucken
    }
  }

  /**
   * Schreibt über eine temporäre Datei und benennt sie danach um. Mehrere Aufrufe laufen
   * nacheinander. Der Inhalt wird erst beim Schreiben gelesen, also immer der neueste Stand.
   * Promise-Kette: Jeder neue Aufruf hängt sich mit .then hinten an den vorigen an.
   */
  schreiben(daten: T): Promise<void> {
    this.schreibvorgang = this.schreibvorgang
      .catch(() => {}) // ein früherer Fehler soll spätere Schreibvorgänge nicht blockieren
      .then(async () => {
        const tmp = `${this.pfad}.tmp`
        await Deno.writeTextFile(tmp, JSON.stringify(daten, null, 2)) // 2 = eingerückt, lesbar
        await Deno.rename(tmp, this.pfad) // Umbenennen ist atomar: alt oder neu, nie halb
      })
    return this.schreibvorgang
  }
}
