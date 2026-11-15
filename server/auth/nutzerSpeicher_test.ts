import { assert, assertEquals, assertRejects } from '@std/assert'
import { mitTempOrdner } from '../testHilfen.ts'
import { NutzerSpeicher } from './nutzerSpeicher.ts'

Deno.test('laden: ohne Datei startet der Speicher leer', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    assertEquals(speicher.nachName('nudl'), null)
  }))

Deno.test('anlegen: Nutzer ist danach per Name und Id auffindbar', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    const neu = await speicher.anlegen('nudl', 'hash')
    assert(neu)
    assertEquals(neu.name, 'nudl')
    assertEquals(speicher.nachName('nudl'), neu)
    assertEquals(speicher.nachId(neu.id), neu)
  }))

Deno.test('nachName und nachId: Unbekanntes ergibt null', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    await speicher.anlegen('nudl', 'hash')
    assertEquals(speicher.nachName('nudel'), null)
    assertEquals(speicher.nachId('gibt-es-nicht'), null)
  }))

Deno.test('Name ist ohne Groß- und Kleinschreibung eindeutig', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    await speicher.anlegen('Nudl', 'hash')
    assertEquals(speicher.nachName('NUDL')?.name, 'Nudl')
    assertEquals(await speicher.anlegen('nudl', 'hash'), null)
  }))

Deno.test('Nutzer bleiben nach erneutem Laden erhalten', () =>
  mitTempOrdner(async (pfad) => {
    const neu = await (await NutzerSpeicher.laden(pfad)).anlegen('nudl', 'hash')
    const neuGeladen = await NutzerSpeicher.laden(pfad)
    assertEquals(neuGeladen.nachName('nudl'), neu)
  }))

Deno.test('Gleichzeitiges Anlegen verliert keinen Nutzer', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    await Promise.all([speicher.anlegen('anna', 'h1'), speicher.anlegen('bert', 'h2')])
    const neuGeladen = await NutzerSpeicher.laden(pfad)
    assert(neuGeladen.nachName('anna'))
    assert(neuGeladen.nachName('bert'))
  }))

Deno.test('laden: kaputte Datei wirft, statt alle Nutzer zu überschreiben', () =>
  mitTempOrdner(async (pfad) => {
    await Deno.writeTextFile(pfad, '{kaputt')
    await assertRejects(() => NutzerSpeicher.laden(pfad), SyntaxError)
  }))

Deno.test('schwierigkeit: neue Nutzer starten mit standard', () =>
  mitTempOrdner(async (pfad) => {
    const neu = await (await NutzerSpeicher.laden(pfad)).anlegen('nudl', 'hash')
    assertEquals(neu?.schwierigkeit, 'standard')
  }))

Deno.test('schwierigkeitMerken: bleibt nach erneutem Laden erhalten', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    const neu = await speicher.anlegen('nudl', 'hash')
    await speicher.schwierigkeitMerken(neu!.id, 'schwer')
    assertEquals((await NutzerSpeicher.laden(pfad)).nachId(neu!.id)?.schwierigkeit, 'schwer')
  }))

Deno.test('schwierigkeitMerken: unbekannte Id ändert nichts und wirft nicht', () =>
  mitTempOrdner(async (pfad) => {
    const speicher = await NutzerSpeicher.laden(pfad)
    await speicher.schwierigkeitMerken('gibt-es-nicht', 'schwer')
    assertEquals(speicher.nachId('gibt-es-nicht'), null)
  }))

Deno.test('laden: Konten ohne Schwierigkeit (aus Phase 2) erhalten standard', () =>
  mitTempOrdner(async (pfad) => {
    await Deno.writeTextFile(pfad, JSON.stringify([{ id: 'alt', name: 'alt', passwortHash: 'h' }]))
    assertEquals((await NutzerSpeicher.laden(pfad)).nachId('alt')?.schwierigkeit, 'standard')
  }))
