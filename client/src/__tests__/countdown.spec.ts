import { describe, expect, it } from 'vitest'
import { restSekunden, zeitText } from '../countdown'

const ENDE = '2026-11-16T10:03:00.000Z'
const um = (zeit: string) => Date.parse(`2026-11-16T${zeit}.000Z`)

describe('restSekunden', () => {
  it('rechnet die Sekunden bis zum Ende', () => {
    expect(restSekunden(ENDE, 0, um('10:00:00'))).toBe(180)
  })

  it('rundet angebrochene Sekunden auf, damit 0:00 erst am Ende erscheint', () => {
    expect(restSekunden(ENDE, 0, um('10:02:59') + 500)).toBe(1)
  })

  it('wird nie negativ', () => {
    expect(restSekunden(ENDE, 0, um('10:05:00'))).toBe(0)
  })

  it('gleicht eine nachgehende Browseruhr über den Versatz aus', () => {
    // Browser zeigt 09:55, der Server 10:00: Versatz +5 Minuten
    expect(restSekunden(ENDE, 5 * 60 * 1000, um('09:55:00'))).toBe(180)
  })
})

describe('zeitText', () => {
  it('schreibt m:ss mit führender Null bei den Sekunden', () => {
    expect(zeitText(180)).toBe('3:00')
    expect(zeitText(125)).toBe('2:05')
    expect(zeitText(9)).toBe('0:09')
    expect(zeitText(0)).toBe('0:00')
  })
})
