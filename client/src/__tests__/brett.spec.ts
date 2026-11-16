import type { LabyrinthEntwurf, Mauer } from '@shared/types.ts'
import { MAX_MAUERN } from '@shared/types.ts'
import { describe, expect, it } from 'vitest'
import { mauerUmschalten, schatzSetzen, SPALTEN, zelle, ZEILEN } from '../brett'

const LEER: LabyrinthEntwurf = { schatz: null, mauern: [] }

describe('zelle', () => {
  it('baut den Namen aus Zeile und Spalte', () => {
    expect(zelle('C', 4)).toBe('C4')
  })

  it('ergibt mit ZEILEN und SPALTEN alle 36 Zellen', () => {
    const alle = ZEILEN.flatMap((z) => SPALTEN.map((s) => zelle(z, s)))
    expect(alle).toHaveLength(36)
    expect(alle[0]).toBe('A1')
    expect(alle[35]).toBe('F6')
  })
})

describe('mauerUmschalten', () => {
  it('setzt eine fehlende Mauer', () => {
    expect(mauerUmschalten(LEER, 'A1_A2')?.mauern).toEqual(['A1_A2'])
  })

  it('entfernt eine vorhandene Mauer und lässt die anderen stehen', () => {
    const entwurf: LabyrinthEntwurf = { schatz: 'C4', mauern: ['A1_A2', 'B2_B3'] }
    expect(mauerUmschalten(entwurf, 'A1_A2')).toEqual({ schatz: 'C4', mauern: ['B2_B3'] })
  })

  it('verändert den alten Entwurf nicht', () => {
    const entwurf: LabyrinthEntwurf = { schatz: null, mauern: ['A1_A2'] }
    mauerUmschalten(entwurf, 'B2_B3')
    mauerUmschalten(entwurf, 'A1_A2')
    expect(entwurf.mauern).toEqual(['A1_A2'])
  })

  it('lehnt die 31. Mauer ab, erlaubt bei 30 aber das Entfernen', () => {
    const mauern = Array.from({ length: MAX_MAUERN }, (_, i) => `M${i}` as Mauer)
    const voll: LabyrinthEntwurf = { schatz: null, mauern }
    expect(mauerUmschalten(voll, 'F5_F6')).toBeNull()
    expect(mauerUmschalten(voll, mauern[0]!)?.mauern).toHaveLength(MAX_MAUERN - 1)
  })
})

describe('schatzSetzen', () => {
  it('legt den Schatz und lässt die Mauern unverändert', () => {
    const entwurf: LabyrinthEntwurf = { schatz: null, mauern: ['A1_A2'] }
    expect(schatzSetzen(entwurf, 'C4')).toEqual({ schatz: 'C4', mauern: ['A1_A2'] })
  })

  it('verschiebt einen schon gesetzten Schatz', () => {
    expect(schatzSetzen({ schatz: 'C4', mauern: [] }, 'F6')?.schatz).toBe('F6')
  })

  it('lehnt A1 ab, denn dort startet der Gegner', () => {
    expect(schatzSetzen(LEER, 'A1')).toBeNull()
  })
})
