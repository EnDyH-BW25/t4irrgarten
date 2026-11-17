<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Ergebnis } from '@shared/types.ts'
import { ApiFehler } from '@/api'
import { ENDEGRUND_TEXT, SCHWIERIGKEITEN, datumText } from '@/anzeige'
import { ergebnisseLaden } from '@/ergebnisse'

/** Einträge pro Abruf; "Mehr laden" holt die nächste Seite */
const SEITE = 20

const router = useRouter()
const liste = ref<Ergebnis[]>([])
const laedt = ref(false)
/** false, sobald eine Seite kürzer als SEITE zurückkam: Dann gibt es nichts mehr */
const mehrDa = ref(true)
const meldung = ref<string | null>(null)

/** Hängt die nächste Seite an. offset ist die Zahl der schon geladenen Einträge. */
async function naechsteSeite() {
  laedt.value = true
  meldung.value = null
  try {
    const seite = await ergebnisseLaden(SEITE, liste.value.length)
    liste.value.push(...seite)
    mehrDa.value = seite.length === SEITE
  } catch (e) {
    meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
  } finally {
    laedt.value = false
  }
}

function schwierigkeitText(e: Ergebnis): string {
  return SCHWIERIGKEITEN.find((s) => s.wert === e.schwierigkeit)?.text ?? ''
}

onMounted(naechsteSeite)
</script>

<template>
  <section class="mx-auto max-w-md space-y-4">
    <h1 class="font-titel text-2xl">Ergebnisse</h1>

    <p
      v-if="!laedt && !meldung && liste.length === 0"
      data-test="keine-spiele"
      class="text-slate-600"
    >
      Noch keine Spiele beendet.
    </p>

    <ul class="space-y-2">
      <li v-for="e in liste" :key="e.id" data-test="ergebnis" class="rounded-lg bg-white shadow">
        <!-- details/summary: Der Browser klappt selbst auf und zu, ohne eigenen Zustand -->
        <details>
          <summary class="flex cursor-pointer items-center justify-between gap-2 p-3">
            <span class="min-w-0 truncate">
              {{ e.modus === 'computer' ? 'Computer' : e.gegner }}
            </span>
            <span
              class="shrink-0 rounded px-2 py-0.5 text-sm"
              :class="
                e.ausgang === 'sieg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              "
            >
              {{ e.ausgang === 'sieg' ? 'Sieg' : 'Niederlage' }}
            </span>
          </summary>
          <dl data-test="details" class="grid grid-cols-2 gap-x-3 gap-y-1 px-3 pb-3 text-sm">
            <dt class="text-slate-500">Datum</dt>
            <dd>{{ datumText(e.beendetAm) }}</dd>
            <dt class="text-slate-500">Gegner</dt>
            <dd>{{ e.gegner }}</dd>
            <template v-if="e.modus === 'computer'">
              <dt class="text-slate-500">Schwierigkeit</dt>
              <dd>{{ schwierigkeitText(e) }}</dd>
            </template>
            <dt class="text-slate-500">Meine Anfragen</dt>
            <dd>{{ e.anfragen }}</dd>
            <dt class="text-slate-500">Ende</dt>
            <dd>{{ ENDEGRUND_TEXT[e.endegrund] }}</dd>
            <!-- Turnier gibt es erst mit Phase 7; die Zeile steht schon bereit -->
            <template v-if="e.competitionId">
              <dt class="text-slate-500">Turnier</dt>
              <dd>Runde {{ e.runde }}</dd>
            </template>
          </dl>
        </details>
      </li>
    </ul>

    <p v-if="meldung" data-test="meldung" role="alert" class="text-sm text-red-600">
      {{ meldung }}
    </p>

    <button
      v-if="mehrDa && liste.length > 0"
      type="button"
      data-test="mehr"
      class="w-full rounded bg-slate-200 px-3 py-2 disabled:opacity-50"
      :disabled="laedt"
      @click="naechsteSeite"
    >
      Mehr laden
    </button>

    <button
      type="button"
      class="w-full rounded bg-blue-700 px-3 py-2 text-white"
      @click="router.push('/dashboard')"
    >
      Zum Dashboard
    </button>
  </section>
</template>
