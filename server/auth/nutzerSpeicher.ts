import type { Nutzer, Schwierigkeit } from '../../shared/types.ts'

/** Nutzer mit Passwort-Hash; verlässt nie den Server */
export type GespeicherterNutzer = Nutzer & { passwortHash: string }

/** Nur die Felder, die der Client sehen darf. Jedes Feld einzeln, damit der Hash nie mitrutscht. */
export function alsNutzer(n: GespeicherterNutzer): Nutzer {
  return { id: n.id, name: n.name, schwierigkeit: n.schwierigkeit }
}

/** Hält alle Nutzer im Speicher und schreibt jede Änderung in eine JSON-Datei */
export class NutzerSpeicher {
  private schreibvorgang: Promise<void> = Promise.resolve()

  private constructor(
    private readonly pfad: string,
    private readonly nutzer: GespeicherterNutzer[],
  ) {}

  /** Liest die Datei; fehlt sie, startet der Speicher leer */
  static async laden(pfad: string): Promise<NutzerSpeicher> {
    try {
      const text = await Deno.readTextFile(pfad)
      const gelesen: GespeicherterNutzer[] = JSON.parse(text)
      // Konten aus Phase 2 kennen die Schwierigkeit noch nicht
      for (const n of gelesen) n.schwierigkeit ??= 'standard'
      return new NutzerSpeicher(pfad, gelesen)
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return new NutzerSpeicher(pfad, [])
      throw err
    }
  }

  /** Sucht ohne Rücksicht auf Groß- und Kleinschreibung */
  nachName(name: string): GespeicherterNutzer | null {
    const gesucht = name.toLowerCase()
    return this.nutzer.find((n) => n.name.toLowerCase() === gesucht) ?? null
  }

  nachId(id: string): GespeicherterNutzer | null {
    return this.nutzer.find((n) => n.id === id) ?? null
  }

  /** Legt einen Nutzer an; null, wenn der Name schon vergeben ist */
  async anlegen(name: string, passwortHash: string): Promise<GespeicherterNutzer | null> {
    if (this.nachName(name)) return null
    const neu: GespeicherterNutzer = {
      id: crypto.randomUUID(),
      name,
      schwierigkeit: 'standard',
      passwortHash,
    }
    this.nutzer.push(neu)
    await this.speichern()
    return neu
  }

  /** Merkt sich die zuletzt gespielte Schwierigkeit. Schreibt nur, wenn sie sich ändert. */
  async schwierigkeitMerken(id: string, schwierigkeit: Schwierigkeit): Promise<void> {
    const nutzer = this.nachId(id)
    if (!nutzer || nutzer.schwierigkeit === schwierigkeit) return
    nutzer.schwierigkeit = schwierigkeit
    await this.speichern()
  }

  /** Schreibt nacheinander und über eine temporäre Datei, damit die Datei nie halb fertig ist */
  private speichern(): Promise<void> {
    this.schreibvorgang = this.schreibvorgang
      .catch(() => {}) // ein früherer Fehler soll spätere Schreibvorgänge nicht blockieren
      .then(async () => {
        const tmp = `${this.pfad}.tmp`
        await Deno.writeTextFile(tmp, JSON.stringify(this.nutzer, null, 2))
        await Deno.rename(tmp, this.pfad)
      })
    return this.schreibvorgang
  }
}
