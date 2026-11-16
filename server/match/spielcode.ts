import type { Zufall } from '../spiellogik/generator.ts'

/** Erlaubte Zeichen: ohne 0, O, 1 und I, weil man sie beim Abtippen verwechselt (ADR-009) */
export const CODE_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Länge eines Spielcodes */
export const CODE_LAENGE = 5

/** Erzeugt einen zufälligen Code wie "K7M2P" */
export function codeErzeugen(zufall: Zufall = Math.random): string {
  let code = ''
  for (let i = 0; i < CODE_LAENGE; i++) {
    code += CODE_ZEICHEN[Math.floor(zufall() * CODE_ZEICHEN.length)]
  }
  return code
}

/**
 * Erzeugt einen Code, den gerade kein wartendes Duell nutzt. Bei 32^5 (etwa 33 Millionen)
 * möglichen Codes trifft schon der erste Versuch fast immer.
 */
export function freienCodeErzeugen(
  istVergeben: (code: string) => boolean,
  zufall: Zufall = Math.random,
): string {
  let code = codeErzeugen(zufall)
  while (istVergeben(code)) code = codeErzeugen(zufall)
  return code
}

/** Macht eine Eingabe vergleichbar: " k7m2p " wird zu "K7M2P" */
export function codeNormieren(eingabe: string): string {
  return eingabe.trim().toUpperCase()
}
