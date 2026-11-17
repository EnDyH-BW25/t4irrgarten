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
    const fehlend = neue.filter((n) =>
      !this.eintraege.some((e) => e.matchId === n.matchId && e.nutzerId === n.nutzerId)
    )
    if (fehlend.length === 0) return
    this.eintraege.push(...fehlend)
    await this.datei?.schreiben(this.eintraege)
  }

  /** Ergebnisse eines Nutzers, neueste zuerst */
  vonNutzer(nutzerId: string): Ergebnis[] {
    return this.eintraege
      .filter((e) => e.nutzerId === nutzerId)
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
