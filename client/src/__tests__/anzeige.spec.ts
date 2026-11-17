import type { Ergebnis } from '@shared/types.ts'
import { describe, expect, it } from 'vitest'
import { gegnerText, quoteText } from '../anzeige'

describe('anzeige', () => {
  it('quoteText rundet auf ganze Prozent', () => {
    expect(quoteText(0)).toBe('0 %')
    expect(quoteText(2 / 3)).toBe('67 %')
    expect(quoteText(1)).toBe('100 %')
  })

  it('gegnerText nennt beim Computer die Schwierigkeit, sonst den Namen', () => {
    const basis = { gegner: 'Computer', schwierigkeit: 'einfach', modus: 'computer' } as Ergebnis
    expect(gegnerText(basis)).toBe('Computer (Einfach)')
    expect(gegnerText({ ...basis, modus: 'duell', gegner: 'anna', schwierigkeit: null })).toBe(
      'anna',
    )
  })
})
