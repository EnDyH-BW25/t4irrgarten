/**
 * SESSIONS IM ARBEITSSPEICHER (ADR-023)
 * Nach dem Login bekommt der Browser eine zufällige Session-Id (sid) als Cookie.
 * Bei jedem Request schickt er sie mit, der Server schlägt hier nach, wer das ist.
 * Einfache Map statt Datenbank: Nach einem Neustart sind alle abgemeldet (bewusst in Kauf
 * genommen). Kein Ablauf der Session, siehe offene Punkte in den ADRs.
 */

/** Hält die laufenden Sessions im Speicher: Session-Id zu Nutzer-Id */
export class Sessions {
  private readonly zuordnung = new Map<string, string>() // sid => nutzerId

  /** Startet eine Session und liefert ihre zufällige Id für das Cookie */
  starten(nutzerId: string): string {
    // randomUUID: 122 Bit Zufall, praktisch nicht zu erraten
    const sid = crypto.randomUUID()
    this.zuordnung.set(sid, nutzerId)
    return sid
  }

  /** Liefert die Nutzer-Id zur Session oder null */
  nutzerId(sid: string): string | null {
    return this.zuordnung.get(sid) ?? null
  }

  /** Logout: Die sid ist danach wertlos, auch wenn der Browser das Cookie noch hätte */
  beenden(sid: string): void {
    this.zuordnung.delete(sid)
  }
}
