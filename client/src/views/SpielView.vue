<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { Match } from '@shared/types.ts'
import { ApiFehler, get } from '@/api'
import { SCHWIERIGKEITEN, STATUS_TEXT } from '@/anzeige'
import { aufgeben } from '@/matches'

/** Kommt aus der URL /spiel/:id (props: true im Router) */
const props = defineProps<{ id: string }>()
const router = useRouter()

const match = ref<Match | null>(null)
const meldung = ref<string | null>(null)

async function laden() {
  try {
    match.value = await get<Match>(`/matches/${props.id}`)
  } catch (e) {
    meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
  }
}

async function aufgebenKlicken() {
  try {
    await aufgeben(props.id)
    await router.push('/dashboard')
  } catch (e) {
    meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
  }
}

onMounted(laden)
</script>

<template>
  <section class="space-y-4">
    <p v-if="meldung" data-test="meldung" role="alert" class="text-red-600">
      {{ meldung }}
      <RouterLink to="/dashboard" class="underline">Zum Dashboard</RouterLink>
    </p>

    <template v-else-if="match">
      <h1 class="font-titel text-2xl">Spiel gegen den Computer</h1>
      <p data-test="status" class="text-slate-600">
        {{ STATUS_TEXT[match.status] }}
        <template v-if="match.schwierigkeit">
          · {{ SCHWIERIGKEITEN.find((s) => s.wert === match!.schwierigkeit)?.text }}
        </template>
      </p>

      <!-- Platzhalter: Das Spielbrett folgt in Schritt 7 -->
      <div
        class="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-slate-500"
      >
        Hier entsteht das Spielbrett.
      </div>

      <button
        v-if="match.status === 'aufbau' || match.status === 'laeuft'"
        type="button"
        data-test="aufgeben"
        class="rounded bg-slate-200 px-3 py-2"
        @click="aufgebenKlicken"
      >
        Aufgeben
      </button>
    </template>

    <p v-else class="text-slate-600">Lade ...</p>
  </section>
</template>
