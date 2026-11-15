<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Match, Schwierigkeit } from '@shared/types.ts'
import { ApiFehler } from '@/api'
import { nutzer } from '@/anmeldung'
import { SCHWIERIGKEITEN, STATUS_TEXT } from '@/anzeige'
import { aufgeben, matchAnlegen, offenesMatch } from '@/matches'

const router = useRouter()

// Vorgewählt ist die zuletzt gespielte Schwierigkeit aus dem Account (ADR-027)
const schwierigkeit = ref<Schwierigkeit>(nutzer.value?.schwierigkeit ?? 'standard')

/** Offenes Match des Nutzers; null heißt: Er kann ein neues starten */
const laufend = ref<Match | null>(null)
const laedt = ref(true)
const auswahlOffen = ref(false)
const sendet = ref(false)
const meldung = ref<string | null>(null)

function fehlerZeigen(e: unknown) {
  meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
}

async function laden() {
  laedt.value = true
  meldung.value = null
  try {
    laufend.value = await offenesMatch()
  } catch (e) {
    fehlerZeigen(e)
  } finally {
    laedt.value = false
  }
}

async function gegenComputerStarten() {
  sendet.value = true
  meldung.value = null
  try {
    const match = await matchAnlegen(schwierigkeit.value)
    // Der Server hat sich die Wahl gemerkt; lokal nachziehen spart einen Abruf von /auth/me
    if (nutzer.value) nutzer.value.schwierigkeit = schwierigkeit.value
    await router.push(`/spiel/${match.id}`)
  } catch (e) {
    // 409: Es gibt doch ein offenes Match, zum Beispiel aus einem anderen Tab
    if (e instanceof ApiFehler && e.status === 409) await laden()
    else fehlerZeigen(e)
  } finally {
    sendet.value = false
  }
}

async function laufendesAufgeben() {
  if (!laufend.value) return
  sendet.value = true
  meldung.value = null
  try {
    await aufgeben(laufend.value.id)
    laufend.value = null
  } catch (e) {
    fehlerZeigen(e)
  } finally {
    sendet.value = false
  }
}

onMounted(laden)
</script>

<template>
  <section class="mx-auto max-w-md space-y-6">
    <h1 class="font-titel text-2xl">Dashboard</h1>

    <label class="block">
      <span class="text-sm">Schwierigkeit</span>
      <select
        v-model="schwierigkeit"
        data-test="schwierigkeit"
        class="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
      >
        <option v-for="s in SCHWIERIGKEITEN" :key="s.wert" :value="s.wert">{{ s.text }}</option>
      </select>
    </label>

    <p v-if="laedt" class="text-slate-600">Lade ...</p>

    <!-- Offenes Match: zurück ins Spiel oder aufgeben -->
    <div v-else-if="laufend" data-test="laufend" class="rounded-lg bg-white p-4 shadow">
      <h2 class="font-titel text-lg">Laufendes Spiel</h2>
      <p class="mt-1 text-sm text-slate-600">
        Gegen {{ laufend.spieler.find((s) => s.istComputer) ? 'den Computer' : 'einen Gegner' }} ·
        {{ STATUS_TEXT[laufend.status] }}
      </p>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          data-test="fortsetzen"
          class="rounded bg-blue-700 px-3 py-2 text-white"
          @click="router.push(`/spiel/${laufend.id}`)"
        >
          Fortsetzen
        </button>
        <button
          type="button"
          data-test="aufgeben"
          class="rounded bg-slate-200 px-3 py-2 disabled:opacity-50"
          :disabled="sendet"
          @click="laufendesAufgeben"
        >
          Aufgeben
        </button>
      </div>
    </div>

    <!-- Kein offenes Match: neues Spiel starten -->
    <div v-else class="space-y-2">
      <button
        type="button"
        data-test="neues-spiel"
        class="w-full rounded bg-blue-700 px-3 py-2 text-white"
        @click="auswahlOffen = !auswahlOffen"
      >
        Neues Spiel
      </button>
      <div v-if="auswahlOffen" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-test="computer-gegner"
          class="rounded bg-orange-300 px-3 py-2 disabled:opacity-50"
          :disabled="sendet"
          @click="gegenComputerStarten"
        >
          Computer-Gegner
        </button>
        <button
          type="button"
          data-test="live-gegner"
          class="rounded bg-slate-200 px-3 py-2 opacity-50"
          title="Das Duell folgt in einer späteren Version."
          disabled
        >
          Live-Gegner
        </button>
      </div>
    </div>

    <p v-if="meldung" data-test="meldung" role="alert" class="text-sm text-red-600">
      {{ meldung }}
    </p>

    <p class="text-sm text-slate-500">Statistik und Ergebnisse folgen in Phase 6.</p>
  </section>
</template>
