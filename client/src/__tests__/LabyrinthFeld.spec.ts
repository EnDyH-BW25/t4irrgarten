import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LabyrinthFeld from '../components/LabyrinthFeld.vue'

const feld = (props: Record<string, unknown> = {}) =>
  mount(LabyrinthFeld, { props: { art: 'eigen', mauern: [], ...props } })

describe('LabyrinthFeld', () => {
  it('zeichnet 36 Felder und 60 Mauerplätze', () => {
    const w = feld()
    expect(w.findAll('[data-test^=zelle-]')).toHaveLength(36)
    expect(w.findAll('[data-test^=mauer-]')).toHaveLength(60)
  })

  it('benennt Mauern mit der kleineren Zelle zuerst, wie der Server es erwartet', () => {
    const w = feld()
    expect(w.find('[data-test=mauer-A1_A2]').exists()).toBe(true) // rechts von A1
    expect(w.find('[data-test=mauer-A1_B1]').exists()).toBe(true) // unter A1
    expect(w.find('[data-test=mauer-A2_A1]').exists()).toBe(false)
    expect(w.find('[data-test=mauer-F6_F7]').exists()).toBe(false) // kein Platz am Rand
  })

  it('meldet Klicks auf Mauer und Feld, wenn es bearbeitbar ist', async () => {
    const w = feld({ bearbeitbar: true })
    await w.find('[data-test=mauer-B2_B3]').trigger('click')
    await w.find('[data-test=zelle-C4]').trigger('click')
    expect(w.emitted('mauer')).toEqual([['B2_B3']])
    expect(w.emitted('zelle')).toEqual([['C4']])
  })

  it('meldet keine Klicks, wenn es nicht bearbeitbar ist', async () => {
    const w = feld()
    await w.find('[data-test=mauer-B2_B3]').trigger('click')
    await w.find('[data-test=zelle-C4]').trigger('click')
    expect(w.emitted('mauer')).toBeUndefined()
    expect(w.emitted('zelle')).toBeUndefined()
  })

  it('zeigt gesetzte und markierte Mauern, Schatz, Figur und besuchte Felder', () => {
    const w = feld({
      mauern: ['A1_A2', 'C3_C4'],
      markierteMauern: ['C3_C4'],
      schatz: 'F6',
      figur: 'B2',
      besucht: ['A1', 'B1'],
    })
    expect(w.find('[data-test=mauer-A1_A2]').classes()).toContain('bg-blue-600')
    expect(w.find('[data-test=mauer-C3_C4]').classes()).toContain('bg-red-600')
    expect(w.find('[data-test=mauer-A1_A2]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-test=zelle-F6] [data-test=schatz]').exists()).toBe(true)
    expect(w.find('[data-test=figur][data-zelle=B2]').exists()).toBe(true)
    expect(w.findAll('[data-test=besucht]')).toHaveLength(2)
    expect(w.find('[data-test=besucht]').classes()).toContain('bg-blue-400')
    expect(w.find('[data-test=roboter]').exists()).toBe(true)
  })

  it('nutzt beim Gegner die Farben aus design.md', () => {
    const w = feld({ art: 'gegner', mauern: ['A1_A2'], besucht: ['A1'] })
    expect(w.find('[data-test=zelle-A1]').classes()).toContain('bg-orange-300')
    expect(w.find('[data-test=mauer-A1_A2]').classes()).toContain('bg-orange-600')
    expect(w.find('[data-test=besucht]').classes()).toContain('bg-orange-400')
  })

  it('zeigt im gegnerischen Irrgarten mich als Geist', () => {
    const w = feld({ art: 'gegner', figur: 'B2' })
    expect(w.find('[data-test=geist]').exists()).toBe(true)
    expect(w.find('[data-test=roboter]').exists()).toBe(false)
  })

  it('rückt Schatz und Figur auseinander, wenn beide auf einem Feld stehen', () => {
    const w = feld({ art: 'gegner', schatz: 'C3', figur: 'C3' })
    const schatz = w.find('[data-test=zelle-C3] [data-test=schatz]').element.parentElement!
    expect(schatz.className).toContain('-translate-x-[24%]')
    expect(schatz.className).toContain('scale-75')
    const figur = w.find('[data-test=geist]').classes()
    expect(figur).toContain('translate-x-[14%]')
    expect(figur).not.toContain('scale-75')
  })

  it('lässt Schatz und Figur mittig, solange sie auf verschiedenen Feldern stehen', () => {
    const w = feld({ art: 'gegner', schatz: 'C3', figur: 'C2' })
    expect(w.find('[data-test=schatz]').element.parentElement!.className).not.toContain('scale-75')
    expect(w.find('[data-test=geist]').classes()).not.toContain('translate-x-[14%]')
  })

  it('zeichnet Plättchen in beiden Irrgärten gleich groß', () => {
    const eigen = feld({ besucht: ['A1'] })
      .find('[data-test=besucht]')
      .classes()
    const gegner = feld({ art: 'gegner', besucht: ['A1'] })
      .find('[data-test=besucht]')
      .classes()
    expect(eigen.filter((k) => !k.startsWith('bg-'))).toEqual(
      gegner.filter((k) => !k.startsWith('bg-')),
    )
  })

  it('zeigt einen pulsierenden Ring, wenn die Figur auf dem Schatz steht', () => {
    expect(feld({ schatz: 'C3', figur: 'C2' }).find('[data-test=schatz-gefunden]').exists()).toBe(
      false,
    )
    expect(feld({ schatz: 'C3', figur: 'C3' }).find('[data-test=schatz-gefunden]').exists()).toBe(
      true,
    )
  })

  it('zeigt eine markierte Mauer nicht mehr rot, sobald sie entfernt ist', () => {
    const w = feld({ mauern: [], markierteMauern: ['C3_C4'], bearbeitbar: true })
    expect(w.find('[data-test=mauer-C3_C4]').classes()).not.toContain('bg-red-600')
  })

  it('macht im Spiel nur die Ziele klickbar, keine Mauern', async () => {
    const w = feld({ art: 'gegner', ziele: ['A2', 'B1'] })
    expect(w.find('[data-test=zelle-A2]').attributes('disabled')).toBeUndefined()
    expect(w.find('[data-test=zelle-C3]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test=mauer-A1_A2]').attributes('disabled')).toBeDefined()
    await w.find('[data-test=zelle-B1]').trigger('click')
    expect(w.emitted('zelle')).toEqual([['B1']])
  })
})
