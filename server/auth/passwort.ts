/**
 * PASSWÖRTER SICHER SPEICHERN (ADR-022): PBKDF2 mit SHA-256 über Web Crypto (in Deno eingebaut)
 * Nie das Passwort selbst speichern, sondern nur einen Hash (Einwegfunktion: kein Weg zurück).
 * Salt: zufällige Bytes je Nutzer. Gleiche Passwörter ergeben so verschiedene Hashes, und
 * vorberechnete Tabellen (Rainbow Tables) nützen einem Angreifer nichts.
 * Iterationen: Der Hash wird 600.000-mal wiederholt. Ein Login dauert dadurch ca. 130 ms,
 * ein Angreifer bräuchte für Millionen Rateversuche aber sehr lange (Brute Force bremsen).
 * Gespeichert wird "iterationen:salt:hash". So lassen sich alte Hashes auch nach einer
 * späteren Erhöhung der Iterationen noch prüfen.
 */

/** Wiederholungen von PBKDF2, Empfehlung von OWASP für SHA-256 */
const ITERATIONEN = 600_000
const SALT_BYTES = 16 // 128 Bit Zufall
const HASH_BITS = 256 // Länge des Ergebnisses

/** Leitet aus Passwort und Salt den Hash ab */
async function ableiten(
  passwort: string,
  salt: Uint8Array<ArrayBuffer>,
  iterationen: number,
): Promise<Uint8Array<ArrayBuffer>> {
  // Schritt 1: Passwort-Text in ein Schlüsselobjekt für Web Crypto umwandeln
  const schluessel = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passwort),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  // Schritt 2: daraus mit Salt und vielen Wiederholungen 256 Bit ableiten
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iterationen },
    schluessel,
    HASH_BITS,
  )
  return new Uint8Array(bits)
}

/** Bytes als Text zum Speichern, z. B. [10, 255] => "0aff" (2 Zeichen je Byte) */
function zuHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Rückweg von zuHex; null bei ungültigem Text (Regex: nur Paare aus 0-9 und a-f) */
function ausHex(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^([0-9a-f]{2})+$/.test(text)) return null
  return new Uint8Array(text.match(/../g)!.map((paar) => parseInt(paar, 16)))
}

/** Vergleicht in konstanter Zeit, damit die Laufzeit nichts über den Hash verrät */
function gleich(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  // Kein "return false" beim ersten Unterschied: Immer alle Bytes prüfen (Timing-Angriff).
  // ^ (XOR) ergibt 0 bei gleichen Bytes, |= sammelt jeden Unterschied auf.
  let unterschied = 0
  for (let i = 0; i < a.length; i++) unterschied |= a[i] ^ b[i]
  return unterschied === 0
}

/** Erzeugt den Text zum Speichern im Format iterationen:salt:hash */
export async function passwortHashen(passwort: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await ableiten(passwort, salt, ITERATIONEN)
  return `${ITERATIONEN}:${zuHex(salt)}:${zuHex(hash)}`
}

/** Prüft ein Passwort gegen den gespeicherten Text; kaputte Texte ergeben false */
export async function passwortPruefen(passwort: string, gespeichert: string): Promise<boolean> {
  const teile = gespeichert.split(':')
  if (teile.length !== 3) return false
  const iterationen = Number(teile[0])
  const salt = ausHex(teile[1])
  const erwartet = ausHex(teile[2])
  if (!Number.isInteger(iterationen) || iterationen < 1 || !salt || !erwartet) return false

  // Eingabe mit demselben Salt und denselben Iterationen hashen und vergleichen
  const hash = await ableiten(passwort, salt, iterationen)
  return gleich(hash, erwartet)
}
