/**
 * ERGEBNISSPEICHER: beendete Spiele dauerhaft in data/ergebnisse.json (ADR-029)
 * Einziger dauerhafter Speicher neben den Nutzern. Matches verschwinden beim Neustart,
 * ihre Ergebnisse bleiben. Grundlage für Dashboard-Statistik und ErgebnisseView.
 * Ein Eintrag pro Mensch und Match (aus Sicht dieses Menschen: Sieg/Niederlage, Gegnername).
 * Gleiches Muster wie NutzerSpeicher: Liste im Speicher + JsonDatei, Fabrikmethode laden().
 */
import type { Ergebnis, Statistik } from '../../shared/types.ts'
import { JsonDatei } from '../jsonDatei.ts'

/** Ergebnis mit dem Nutzer, dem es gehört; verlässt den Server nur ohne nutzerId */
export type GespeichertesErgebnis = Ergebnis & { nutzerId: string }

/** Hält alle Ergebnisse im Speicher und schreibt jede Änderung in eine JSON-Datei */
export class ErgebnisSpeicher {
  private constructor(
    private readonly datei: JsonDatei<GespeichertesErgebnis[]> | null,
    private readonly eintraege: GespeichertesErgebnis[],
  ) {}

  /** Liest die Datei; fehlt sie, startet der Speicher leer */
  static async laden(pfad: string): Promise<ErgebnisSpeicher> {
    const datei = new JsonDatei<GespeichertesErgebnis[]>(pfad)
    return new ErgebnisSpeicher(datei, await datei.lesen([]))
  }

  /** Speicher ohne Datei, für Tests, in denen Ergebnisse keine Rolle spielen */
  static imSpeicher(): ErgebnisSpeicher {
    return new ErgebnisSpeicher(null, [])
  }

  /**
   * Trägt die Ergebnisse eines Matches ein. Ein Eintrag pro Nutzer und Match: Ein zweiter Aufruf
   * für dasselbe Match ändert nichts und schreibt nicht.
   */
  async eintragen(neue: GespeichertesErgebnis[]): Promise<void> {
    // Schutz vor Dubletten: matchId + nutzerId ist der eindeutige Schlüssel
    const fehlend = neue.filter((n) =>
      !this.eintraege.some((e) => e.matchId === n.matchId && e.nutzerId === n.nutzerId)
    )
    if (fehlend.length === 0) return
    this.eintraege.push(...fehlend)
    await this.datei?.schreiben(this.eintraege)
  }

  /**
   * Trägt nach dem Turnierende den Endplatz in alle Ergebnisse des Turniers ein. Die Ergebnisse
   * der Matches stehen schon da. Ein zweiter Aufruf ändert nichts und schreibt nicht.
   */
  async platzierungEintragen(
    competitionId: string,
    platzierungen: { platz: number; spielerId: string }[],
  ): Promise<void> {
    let geaendert = false
    for (const e of this.eintraege) {
      if (e.competitionId !== competitionId) continue
      const platz = platzierungen.find((p) => p.spielerId === e.nutzerId)?.platz ?? null
      if (e.platzierung !== platz) {
        e.platzierung = platz
        geaendert = true
      }
    }
    if (geaendert) await this.datei?.schreiben(this.eintraege)
  }

  /** Ergebnisse eines Nutzers, neueste zuerst */
  vonNutzer(nutzerId: string): Ergebnis[] {
    return this.eintraege
      .filter((e) => e.nutzerId === nutzerId)
      // ISO-Zeitstempel lassen sich als Text sortieren; b vor a = absteigend (neueste zuerst)
      .sort((a, b) => b.beendetAm.localeCompare(a.beendetAm))
      .map(alsErgebnis)
  }

  /** Zählt Siege und Niederlagen eines Nutzers. Ohne Spiele ist die Quote 0 statt 0 / 0. */
  statistik(nutzerId: string): Statistik {
    const eigene = this.eintraege.filter((e) => e.nutzerId === nutzerId)
    const siege = eigene.filter((e) => e.ausgang === 'sieg').length
    return {
      siege,
      niederlagen: eigene.length - siege,
      quote: eigene.length === 0 ? 0 : siege / eigene.length,
    }
  }
}

/** Sicht des Clients: jedes Feld einzeln, damit nutzerId nie mitrutscht */
function alsErgebnis(e: GespeichertesErgebnis): Ergebnis {
  return {
    id: e.id,
    matchId: e.matchId,
    competitionId: e.competitionId,
    runde: e.runde,
    platzierung: e.platzierung,
    modus: e.modus,
    schwierigkeit: e.schwierigkeit,
    gegner: e.gegner,
    ausgang: e.ausgang,
    endegrund: e.endegrund,
    anfragen: e.anfragen,
    beendetAm: e.beendetAm,
  }
}
