<script setup lang="ts">
import { computed } from 'vue'
import type { Mauer, Zelle } from '@shared/types.ts'
import { SPALTEN, zelle, ZEILEN } from '@/brett'

/**
 * Ein 6x6-Feld. Die Komponente zeigt nur an und meldet Klicks nach oben.
 * Was ein Klick bewirkt, entscheidet die View.
 */
const props = withDefaults(
  defineProps<{
    art: 'eigen' | 'gegner' // eigen: blau mit orangen Mauern, gegner: orange mit blauen Mauern
    mauern: Mauer[]
    markierteMauern?: Mauer[] // problematische Mauern aus der Prüfung (Schritt 8)
    schatz?: Zelle | null
    figur?: Zelle | null
    besucht?: Zelle[]
    bearbeitbar?: boolean
  }>(),
  { markierteMauern: () => [], schatz: null, figur: null, besucht: () => [], bearbeitbar: false },
)

const emit = defineEmits<{ mauer: [mauer: Mauer]; zelle: [zelle: Zelle] }>()

/**
 * Raster mit 1 Beschriftungsspur und 11 Spuren je Richtung: 6 Zellen, dazwischen 5 Mauerplätze.
 * Zelle (z, s) liegt auf Rasterzeile 2 + 2z und Rasterspalte 2 + 2s (beides ab 0 gezählt).
 */
const RASTER = '1.5rem repeat(5, minmax(0, 1fr) 0.6rem) minmax(0, 1fr)'

type Platz = { zeile: number; spalte: number }
type MauerPlatz = Platz & { mauer: Mauer }

const zellen = computed(() =>
  ZEILEN.flatMap((z, i) =>
    SPALTEN.map((s, j) => ({ name: zelle(z, s), zeile: 2 + 2 * i, spalte: 2 + 2 * j })),
  ),
)

/**
 * Alle 60 Mauerplätze. Die Namen entstehen von links nach rechts und von oben nach unten,
 * die kleinere Zelle steht dadurch vorn, wie es der Server erwartet (ADR-021).
 */
const mauerPlaetze = computed(() => {
  const plaetze: MauerPlatz[] = []
  ZEILEN.forEach((z, i) =>
    SPALTEN.forEach((s, j) => {
      const hier = zelle(z, s)
      const rechts = SPALTEN[j + 1]
      const unten = ZEILEN[i + 1]
      if (rechts) {
        plaetze.push({ mauer: `${hier}_${zelle(z, rechts)}`, zeile: 2 + 2 * i, spalte: 3 + 2 * j })
      }
      if (unten) {
        plaetze.push({ mauer: `${hier}_${zelle(unten, s)}`, zeile: 3 + 2 * i, spalte: 2 + 2 * j })
      }
    }),
  )
  return plaetze
})

const gesetzt = computed(() => new Set(props.mauern))
const markiert = computed(() => new Set(props.markierteMauern))
const besucht = computed(() => new Set(props.besucht))

// Farben aus design.md; volle Klassennamen, damit Tailwind sie findet
const feldFarbe = computed(() => (props.art === 'eigen' ? 'bg-blue-300' : 'bg-orange-300'))
const mauerFarbe = computed(() => (props.art === 'eigen' ? 'bg-orange-400' : 'bg-blue-600'))

function mauerKlasse(m: Mauer): string {
  if (!gesetzt.value.has(m)) return props.bearbeitbar ? 'hover:bg-slate-400/60' : ''
  // Rot nur, solange die Mauer noch steht; die Prüfung des Servers kann kurz hinterherhinken
  return markiert.value.has(m) ? 'bg-red-600' : mauerFarbe.value
}

const lage = (p: Platz) => ({ gridRow: p.zeile, gridColumn: p.spalte })
</script>

<template>
  <div
    class="grid w-full max-w-sm select-none"
    :style="{ gridTemplateColumns: RASTER, gridTemplateRows: RASTER }"
  >
    <!-- Beschriftung: Ziffern oben, Buchstaben links -->
    <span
      v-for="(s, j) in SPALTEN"
      :key="`s${s}`"
      class="text-center text-xs text-slate-600"
      :style="{ gridRow: 1, gridColumn: 2 + 2 * j }"
    >
      {{ s }}
    </span>
    <span
      v-for="(z, i) in ZEILEN"
      :key="`z${z}`"
      class="flex items-center text-xs text-slate-600"
      :style="{ gridRow: 2 + 2 * i, gridColumn: 1 }"
    >
      {{ z }}
    </span>

    <!-- Zellen -->
    <button
      v-for="z in zellen"
      :key="z.name"
      type="button"
      :data-test="`zelle-${z.name}`"
      :aria-label="`Feld ${z.name}`"
      :disabled="!bearbeitbar"
      class="relative flex aspect-square items-center justify-center rounded-sm"
      :class="[feldFarbe, bearbeitbar ? 'cursor-pointer hover:brightness-95' : 'cursor-default']"
      :style="lage(z)"
      @click="emit('zelle', z.name)"
    >
      <span
        v-if="besucht.has(z.name)"
        data-test="besucht"
        class="absolute inset-2 rounded-sm bg-orange-600/70"
      />
      <span
        v-if="schatz === z.name"
        data-test="schatz"
        class="relative h-1/2 w-1/2 rotate-45 rounded-sm bg-cyan-300 ring-2 ring-cyan-600"
      />
      <span
        v-if="figur === z.name"
        data-test="figur"
        class="relative h-1/2 w-1/2 rounded-full bg-slate-900"
      />
    </button>

    <!-- Mauerplätze zwischen den Zellen -->
    <button
      v-for="p in mauerPlaetze"
      :key="p.mauer"
      type="button"
      :data-test="`mauer-${p.mauer}`"
      :aria-label="`Mauer ${p.mauer}`"
      :aria-pressed="gesetzt.has(p.mauer)"
      :disabled="!bearbeitbar"
      class="rounded-sm"
      :class="[mauerKlasse(p.mauer), bearbeitbar ? 'cursor-pointer' : 'cursor-default']"
      :style="lage(p)"
      @click="emit('mauer', p.mauer)"
    />
  </div>
</template>
