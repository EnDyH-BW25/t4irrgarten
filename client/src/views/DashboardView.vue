<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Ergebnis, Match, Schwierigkeit, Statistik } from '@shared/types.ts'
import { ApiFehler } from '@/api'
import { nutzer } from '@/anmeldung'
import { SCHWIERIGKEITEN, STATUS_TEXT, datumText, gegnerText, quoteText } from '@/anzeige'
import { ergebnisseLaden, statistikLaden } from '@/ergebnisse'
import { aufgeben, beitreten, duellAnlegen, matchAnlegen, offenesMatch } from '@/matches'

const router = useRouter()

// Vorgewählt ist die zuletzt gespielte Schwierigkeit aus dem Account (ADR-027)
const schwierigkeit = ref<Schwierigkeit>(nutzer.value?.schwierigkeit ?? 'standard')

/** Offenes Match des Nutzers; null heißt: Er kann ein neues starten */
const laufend = ref<Match | null>(null)
const laedt = ref(true)
/** Welche Auswahl unter "Neues Spiel" offen ist */
const auswahlOffen = ref(false)
const liveOffen = ref(false)
const beitretenOffen = ref(false)
/** Eingabe im Feld "Spielcode" */
const code = ref('')
const sendet = ref(false)
const meldung = ref<string | null>(null)

function fehlerZeigen(e: unknown) {
  meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
}

/** Statistik und letzte Spiele; null, solange sie nicht geladen sind */
const statistik = ref<Statistik | null>(null)
const letzte = ref<Ergebnis[]>([])

async function laden() {
  laedt.value = true
  meldung.value = null
  try {
    // Erst das offene Match: Der Abruf trägt abgelaufene Fristen nach (ADR-028).
    // Endete dabei ein Match, steht sein Ergebnis danach schon in der Statistik.
    laufend.value = await offenesMatch()
    const [s, l] = await Promise.all([statistikLaden(), ergebnisseLaden()])
    statistik.value = s
    letzte.value = l
  } catch (e) {
    fehlerZeigen(e)
  } finally {
    laedt.value = false
  }
}

/**
 * Gemeinsamer Ablauf für alle Wege ins Spiel: Server fragen, danach zur Spielansicht.
 * Im Duell zeigt die Spielansicht zuerst den Warteraum.
 */
async function starten(anlegen: () => Promise<Match>) {
  sendet.value = true
  meldung.value = null
  try {
    const match = await anlegen()
    await router.push(`/spiel/${match.id}`)
  } catch (e) {
    // 409: Es gibt doch ein offenes Match, zum Beispiel aus einem anderen Tab
    if (e instanceof ApiFehler && e.status === 409) await laden()
    // Sonst steht die Meldung des Servers da, zum Beispiel "Der Spielcode ist ungültig ..."
    else fehlerZeigen(e)
  } finally {
    sendet.value = false
  }
}

function gegenComputerStarten() {
  return starten(async () => {
    const match = await matchAnlegen(schwierigkeit.value)
    // Der Server hat sich die Wahl gemerkt; lokal nachziehen spart einen Abruf von /auth/me
    if (nutzer.value) nutzer.value.schwierigkeit = schwierigkeit.value
    return match
  })
}

function duellErstellen() {
  return starten(duellAnlegen)
}

function duellBeitreten() {
  return starten(() => beitreten(code.value))
}

/** Erst bei fünf Zeichen lohnt der Versuch; den Rest prüft der Server */
const codeVollstaendig = computed(() => code.value.trim().length === 5)

/** Gegner des offenen Matches in Worten */
const laufendGegner = computed(() => {
  const m = laufend.value
  if (!m) return ''
  if (m.status === 'wartet') return 'Duell im Warteraum'
  if (m.modus === 'computer') return 'Gegen den Computer'
  const gegner = m.spieler.find((s) => s.id !== nutzer.value?.id)
  return `Gegen ${gegner?.name ?? 'einen Gegner'}`
})

async function laufendesAufgeben() {
  if (!laufend.value) return
  sendet.value = true
  meldung.value = null
  try {
    await aufgeben(laufend.value.id)
    // Neu laden: Die Niederlage steht jetzt in Statistik und Liste
    await laden()
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
        {{ laufendGegner }} · {{ STATUS_TEXT[laufend.status] }}
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
          <!-- Im Warteraum gibt es noch keinen Gegner: Das Spiel wird nur abgebrochen -->
          {{ laufend.status === 'wartet' ? 'Abbrechen' : 'Aufgeben' }}
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
          class="rounded bg-orange-300 px-3 py-2 disabled:opacity-50"
          :disabled="sendet"
          @click="liveOffen = !liveOffen"
        >
          Live-Gegner
        </button>
      </div>

      <!-- Live-Gegner: selbst erstellen oder mit Code beitreten (ADR-009) -->
      <div v-if="auswahlOffen && liveOffen" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-test="duell-erstellen"
          class="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          :disabled="sendet"
          @click="duellErstellen"
        >
          Spiel erstellen
        </button>
        <button
          type="button"
          data-test="duell-beitreten"
          class="rounded bg-slate-200 px-3 py-2 disabled:opacity-50"
          :disabled="sendet"
          @click="beitretenOffen = !beitretenOffen"
        >
          Spiel beitreten
        </button>
      </div>

      <form
        v-if="auswahlOffen && liveOffen && beitretenOffen"
        class="flex gap-2"
        @submit.prevent="duellBeitreten"
      >
        <input
          v-model="code"
          data-test="code"
          aria-label="Spielcode"
          placeholder="Spielcode, z. B. K7M2P"
          maxlength="5"
          autocomplete="off"
          class="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 uppercase"
        />
        <button
          type="submit"
          data-test="code-senden"
          class="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          :disabled="sendet || !codeVollstaendig"
        >
          Beitreten
        </button>
      </form>
    </div>

    <p v-if="meldung" data-test="meldung" role="alert" class="text-sm text-red-600">
      {{ meldung }}
    </p>

    <!-- Statistik: Der Server rechnet, das Dashboard zeigt nur an (ADR-014) -->
    <div v-if="statistik" data-test="statistik" class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded-lg bg-white p-3 shadow">
        <p class="font-titel text-2xl" data-test="siege">{{ statistik.siege }}</p>
        <p class="text-sm text-slate-600">Siege</p>
      </div>
      <div class="rounded-lg bg-white p-3 shadow">
        <p class="font-titel text-2xl" data-test="niederlagen">{{ statistik.niederlagen }}</p>
        <p class="text-sm text-slate-600">Niederlagen</p>
      </div>
      <div class="rounded-lg bg-white p-3 shadow">
        <p class="font-titel text-2xl" data-test="quote">{{ quoteText(statistik.quote) }}</p>
        <p class="text-sm text-slate-600">Quote</p>
      </div>
    </div>

    <!-- Letzte 10 Spiele, neueste zuerst -->
    <div v-if="statistik" class="rounded-lg bg-white p-4 shadow">
      <h2 class="font-titel text-lg">Letzte Spiele</h2>
      <p v-if="letzte.length === 0" data-test="keine-spiele" class="mt-1 text-sm text-slate-600">
        Noch keine Spiele beendet.
      </p>
      <ul v-else class="mt-2 divide-y divide-slate-100">
        <li
          v-for="e in letzte"
          :key="e.id"
          data-test="letztes-spiel"
          class="flex items-center justify-between gap-2 py-2 text-sm"
        >
          <span class="min-w-0">
            <span class="block truncate">{{ gegnerText(e) }}</span>
            <span class="text-slate-500">{{ datumText(e.beendetAm) }}</span>
          </span>
          <span
            class="shrink-0 rounded px-2 py-0.5"
            :class="
              e.ausgang === 'sieg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            "
          >
            {{ e.ausgang === 'sieg' ? 'Sieg' : 'Niederlage' }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
