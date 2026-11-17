/**
 * NUTZERSPEICHER: alle Konten, dauerhaft in data/nutzer.json (ADR-023)
 * Prinzip: Alle Nutzer liegen als Liste im Arbeitsspeicher (schnelles Lesen),
 * jede Änderung schreibt die ganze Liste über JsonDatei auf die Platte.
 * Für ein Uni-Projekt mit wenigen Nutzern reicht das. Bei vielen Nutzern wäre eine
 * Datenbank nötig.
 */
import type { Nutzer, Schwierigkeit } from '../../shared/types.ts'
import { JsonDatei } from '../jsonDatei.ts'

/** Nutzer mit Passwort-Hash; verlässt nie den Server */
export type GespeicherterNutzer = Nutzer & { passwortHash: string }

/**
 * Nur die Felder, die der Client sehen darf. Jedes Feld einzeln, damit der Hash nie mitrutscht.
 * Ein { ...n } würde jedes Feld kopieren, auch passwortHash. Darum hier eine Positivliste.
 */
export function alsNutzer(n: GespeicherterNutzer): Nutzer {
  return { id: n.id, name: n.name, schwierigkeit: n.schwierigkeit }
}

/** Hält alle Nutzer im Speicher und schreibt jede Änderung in eine JSON-Datei */
export class NutzerSpeicher {
  // private constructor: "new NutzerSpeicher()" ist von außen verboten. Erzeugen nur über
  // die statische Fabrikmethode laden(), denn das Lesen der Datei ist async (Konstruktoren nicht).
  private constructor(
    private readonly datei: JsonDatei<GespeicherterNutzer[]>,
    private readonly nutzer: GespeicherterNutzer[],
  ) {}

  /** Liest die Datei; fehlt sie, startet der Speicher leer */
  static async laden(pfad: string): Promise<NutzerSpeicher> {
    const datei = new JsonDatei<GespeicherterNutzer[]>(pfad)
    const gelesen = await datei.lesen([])
    // Konten aus Phase 2 kennen die Schwierigkeit noch nicht
    // ??= setzt den Wert nur, wenn er fehlt (kleine Datenmigration beim Laden)
    for (const n of gelesen) n.schwierigkeit ??= 'standard'
    return new NutzerSpeicher(datei, gelesen)
  }

  /** Sucht ohne Rücksicht auf Groß- und Kleinschreibung ("Nudl" und "nudl" sind derselbe Name) */
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

  private speichern(): Promise<void> {
    return this.datei.schreiben(this.nutzer)
  }
}
