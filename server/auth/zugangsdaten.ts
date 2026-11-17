/**
 * EINGABEPRÜFUNG für Login und Registrierung (reine Funktion, wirft nicht)
 * Der Body kommt als unknown herein: Vom Client kann alles kommen, auch Unsinn.
 * Die Funktion prüft Schritt für Schritt und liefert ein Ergebnis-Objekt statt zu werfen.
 * Erst routen.ts macht daraus einen 400-Fehler. So bleibt diese Datei leicht testbar.
 * Sie sammelt alle Probleme, damit der Client Name- und Passwortfehler gleichzeitig zeigt.
 */
import { NAME_LAENGE, PASSWORT_LAENGE } from '../../shared/types.ts'

/** Ein Problem in der Eingabe, wie in details der Fehlerantwort */
type Detail = { feld: string; problem: string }

export type Zugangsdaten = { name: string; passwort: string }

// Discriminated Union: Am Feld ok erkennt TypeScript, ob zugangsdaten oder details da sind
export type ZugangsdatenErgebnis =
  | { ok: true; zugangsdaten: Zugangsdaten }
  | { ok: false; details: Detail[] }

/** Prüft Name und Passwort aus dem Request-Body. Sammelt alle Probleme. */
export function zugangsdatenPruefen(eingabe: unknown): ZugangsdatenErgebnis {
  // typeof null ist in JavaScript auch 'object', Arrays ebenso: darum drei Prüfungen
  if (typeof eingabe !== 'object' || eingabe === null || Array.isArray(eingabe)) {
    return { ok: false, details: [{ feld: 'body', problem: 'Erwartet wird ein JSON-Objekt.' }] }
  }
  const { name, passwort } = eingabe as Record<string, unknown>
  const details: Detail[] = []

  // Leerzeichen am Rand entfernen, damit " nudl" und "nudl" derselbe Name sind
  const sauber = typeof name === 'string' ? name.trim() : ''
  if (sauber.length < NAME_LAENGE.min || sauber.length > NAME_LAENGE.max) {
    details.push({
      feld: 'name',
      problem: `Der Name braucht ${NAME_LAENGE.min} bis ${NAME_LAENGE.max} Zeichen.`,
    })
  }
  // Das Passwort bleibt unverändert, auch Leerzeichen zählen
  const pw = typeof passwort === 'string' ? passwort : ''
  if (pw.length < PASSWORT_LAENGE.min || pw.length > PASSWORT_LAENGE.max) {
    details.push({
      feld: 'passwort',
      problem: `Das Passwort braucht ${PASSWORT_LAENGE.min} bis ${PASSWORT_LAENGE.max} Zeichen.`,
    })
  }

  if (details.length > 0) return { ok: false, details }
  return { ok: true, zugangsdaten: { name: sauber, passwort: pw } }
}
