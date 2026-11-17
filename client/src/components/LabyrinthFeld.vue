<script setup lang="ts">
import { computed } from 'vue'
import { IconDiamond, IconGhost2, IconRobot } from '@tabler/icons-vue'
import type { Mauer, Zelle } from '@shared/types.ts'
import { SPALTEN, zelle, ZEILEN } from '@/brett'

/**
 * Ein 6x6-Feld. Die Komponente zeigt nur an und meldet Klicks nach oben.
 * Was ein Klick bewirkt, entscheidet die View.
 */
const props = withDefaults(
  defineProps<{
    art: 'eigen' | 'gegner' // eigen: alles blau, gegner: alles orange (design.md)
    mauern: Mauer[]
    markierteMauern?: Mauer[] // problematische Mauern aus der Prüfung (Schritt 8)
    schatz?: Zelle | null
    figur?: Zelle | null
    besucht?: Zelle[]
    bearbeitbar?: boolean // Aufbau: Mauern und Felder klickbar
    ziele?: Zelle[] // Spiel: nur diese Felder sind als Ziel einer Anfrage klickbar
  }>(),
  {
    markierteMauern: () => [],
    schatz: null,
    figur: null,
    besucht: () => [],
    bearbeitbar: false,
    ziele: () => [],
  },
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
const ziele = computed(() => new Set(props.ziele))

const zelleKlickbar = (z: Zelle) => props.bearbeitbar || ziele.value.has(z)

// Farben aus design.md; volle Klassennamen, damit Tailwind sie findet
const feldFarbe = computed(() => (props.art === 'eigen' ? 'bg-blue-300' : 'bg-orange-300'))
const mauerFarbe = computed(() => (props.art === 'eigen' ? 'bg-blue-600' : 'bg-orange-600'))
// Plättchen in der Farbfamilie des Feldes, aber nur eine Stufe dunkler als der Hintergrund
const plaettchenFarbe = computed(() => (props.art === 'eigen' ? 'bg-blue-400' : 'bg-orange-400'))

/**
 * Wer läuft hier? Im eigenen Irrgarten sucht der Gegner (Roboter).
 * Im gegnerischen Irrgarten bin ich der Geist, denn das Labyrinth ist mir unbekannt.
 */
const figurIcon = computed(() => (props.art === 'eigen' ? IconRobot : IconGhost2))

/**
 * Steht die Figur auf dem Schatz, rücken beide auseinander.
 * Der Schatz schrumpft auf 75 % und geht in die Ecke oben links.
 * Die Figur behält ihre Größe und rückt in die Ecke unten rechts.
 * translate in Prozent bezieht sich auf das Icon selbst, das 3/4 des Feldes breit ist.
 */
const aufSchatz = computed(() => props.figur !== null && props.figur === props.schatz)

function mauerKlasse(m: Mauer): string {
  if (!gesetzt.value.has(m)) return props.bearbeitbar ? 'hover:bg-slate-400/60' : ''
  // Rot nur, solange die Mauer noch steht; die Prüfung des Servers kann kurz hinterherhinken
  return markiert.value.has(m) ? 'bg-red-600' : mauerFarbe.value
}

const lage = (p: Platz) => ({ gridRow: p.zeile, gridColumn: p.spalte })

/**
 * Die Figur liegt in einer eigenen Ebene über dem Raster und gleitet per CSS-Übergang
 * von Feld zu Feld. Ein Grid-Platz lässt sich nicht animieren, left und top schon.
 * In der Ebene ist ein Feld (100% - 3rem) / 6 breit, dazu kommen 0.6rem Mauerplatz.
 */
const FELD = '((100% - 3rem) / 6)'
const figurLage = computed(() => {
  if (!props.figur) return null
  const i = ZEILEN.indexOf(props.figur[0] as (typeof ZEILEN)[number])
  const j = SPALTEN.indexOf(Number(props.figur.slice(1)) as (typeof SPALTEN)[number])
  return {
    width: `calc${FELD}`,
    height: `calc${FELD}`,
    left: `calc(${j} * (${FELD} + 0.6rem))`,
    top: `calc(${i} * (${FELD} + 0.6rem))`,
  }
})
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
      :disabled="!zelleKlickbar(z.name)"
      class="relative flex aspect-square items-center justify-center rounded-sm"
      :class="[
        feldFarbe,
        zelleKlickbar(z.name) ? 'cursor-pointer hover:brightness-90' : 'cursor-default',
        ziele.has(z.name) ? 'ring-2 ring-slate-900/50 ring-inset' : '',
      ]"
      :style="lage(z)"
      @click="emit('zelle', z.name)"
    >
      <!-- Plättchen: Größe relativ zum Feld, damit es in beiden Irrgärten gleich wirkt -->
      <Transition name="plaettchen">
        <span
          v-if="besucht.has(z.name)"
          data-test="besucht"
          class="absolute inset-[18%] rounded-sm"
          :class="plaettchenFarbe"
        />
      </Transition>
      <Transition name="schatz">
        <span
          v-if="schatz === z.name"
          class="relative flex h-3/4 w-3/4 transition-transform duration-300"
          :class="aufSchatz ? '-translate-x-[24%] -translate-y-[24%] scale-75' : ''"
        >
          <!-- Steht die Figur auf dem Schatz, pulsiert eine Kopie des Diamanten -->
          <IconDiamond
            v-if="figur === z.name"
            data-test="schatz-gefunden"
            class="absolute inset-0 h-full w-full text-cyan-300 motion-safe:animate-ping"
          />
          <IconDiamond
            data-test="schatz"
            stroke="2.5"
            class="relative h-full w-full text-cyan-300 drop-shadow-[0_0_1px_rgb(15_23_42)]"
          />
        </span>
      </Transition>
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
      class="rounded-sm transition-colors duration-300"
      :class="[mauerKlasse(p.mauer), bearbeitbar ? 'cursor-pointer' : 'cursor-default']"
      :style="lage(p)"
      @click="emit('mauer', p.mauer)"
    />

    <!-- Ebene für die Figur: deckt alle Felder ab, lässt Klicks aber durch -->
    <div
      class="pointer-events-none relative"
      style="grid-row: 2 / span 11; grid-column: 2 / span 11"
    >
      <Transition name="figur">
        <span
          v-if="figur && figurLage"
          data-test="figur"
          :data-zelle="figur"
          class="figur absolute flex items-center justify-center"
          :style="figurLage"
        >
          <component
            :is="figurIcon"
            :data-test="art === 'eigen' ? 'roboter' : 'geist'"
            stroke="1.75"
            class="h-3/4 w-3/4 text-slate-900 transition-transform duration-300"
            :class="aufSchatz ? 'translate-x-[14%] translate-y-[14%]' : ''"
          />
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Die Figur gleitet zum nächsten Feld */
.figur {
  transition:
    left 350ms ease-in-out,
    top 350ms ease-in-out;
}

/* Neue Plättchen springen kurz auf */
.plaettchen-enter-active {
  animation: aufspringen 300ms ease-out;
}

/* Der Schatz taucht mit einer Drehung auf, etwa beim Aufdecken nach Spielende */
.schatz-enter-active {
  animation: auftauchen 500ms ease-out;
}

.figur-enter-active,
.figur-leave-active {
  transition: opacity 200ms;
}
.figur-enter-from,
.figur-leave-to {
  opacity: 0;
}

@keyframes aufspringen {
  from {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.15);
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes auftauchen {
  from {
    transform: scale(0) rotate(-90deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}
</style>
