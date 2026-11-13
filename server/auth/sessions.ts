/** Hält die laufenden Sessions im Speicher: Session-Id zu Nutzer-Id */
export class Sessions {
  private readonly zuordnung = new Map<string, string>()

  /** Startet eine Session und liefert ihre zufällige Id für das Cookie */
  starten(nutzerId: string): string {
    const sid = crypto.randomUUID()
    this.zuordnung.set(sid, nutzerId)
    return sid
  }

  /** Liefert die Nutzer-Id zur Session oder null */
  nutzerId(sid: string): string | null {
    return this.zuordnung.get(sid) ?? null
  }

  beenden(sid: string): void {
    this.zuordnung.delete(sid)
  }
}
