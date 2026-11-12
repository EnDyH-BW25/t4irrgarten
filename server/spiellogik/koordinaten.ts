import type { Zelle } from '../../shared/types.ts'

// Ein Buchstabe A-F, danach eine Ziffer 1-6, sonst nichts
const ZELLE_MUSTER = /^[A-F][1-6]$/

/** Prüft, ob ein Text eine gültige Zelle im 6x6-Raster ist, z. B. "C4" */
export function istZelle(text: string): text is Zelle {
  return ZELLE_MUSTER.test(text)
}
