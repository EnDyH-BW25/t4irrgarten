<!--
  TURNIERVIEW (Route /turnier/:id): Warteraum und Übersicht eines Turniers (ADR-036)
  Zwei Zustände:
  1. status wartet: Code (nur Host), Teilnehmerliste, "Turnier starten" ab 3 Spielern
  2. sonst: Runden mit Paarungen, Wartebildschirm, am Ende Platzierung oder Abbruch
  Das Turnier ist nur eine Hülle (ADR-034). Gespielt wird in SpielView.
  Hat der Nutzer ein offenes Match, springt die Seite automatisch dorthin.
  Gleiches Muster wie SpielView: laden + uebernehmen + Polling + Uhr für den Countdown.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Paarung, Turnier } from '@shared/types.ts'
import { TURNIER_MIN_START } from '@shared/types.ts'
import { ApiFehler } from '@/api'
import { nutzer } from '@/anmeldung'
import { SCHWIERIGKEITEN, STATUS_TEXT, turnierStandText } from '@/anzeige'
import { POLL_MS, restSekunden, zeitText } from '@/countdown'
import { turnierAbrufen, turnierStarten, turnierVerlassen } from '@/turniere'

const props = defineProps<{ id: string }>() // aus der URL, dank props: true im Router
const router = useRouter()

const turnier = ref<Turnier | null>(null) // null, bis der erste Abruf da ist
const meldung = ref<string | null>(null)
const sendet = ref(false)

// Countdown des Codes wie in der Spielansicht: Serverzeit minus Browserzeit gleicht die Uhr aus
const versatzMs = ref(0)
const jetzt = ref(Date.now()) // tickt jede Sekunde, dadurch rechnet restSek neu
// Kennungen der Timer, damit onUnmounted sie stoppen kann. Kein ref: Die Anzeige braucht sie nicht.
let uhr: ReturnType<typeof setInterval> | undefined
let polling: ReturnType<typeof setInterval> | undefined

const meineId = computed(() => nutzer.value?.id)
const istHost = computed(() => turnier.value?.hostId === meineId.value)
const vorbei = computed(
  () => turnier.value?.status === 'beendet' || turnier.value?.status === 'abgebrochen',
)

function fehlertext(e: unknown): string {
  return e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
}

/**
 * Jede Antwort läuft hierüber. Hat der Nutzer ein offenes Match, geht es direkt dorthin:
 * Die Übersicht ist der Wartebildschirm zwischen den Runden (Entscheidung Phase 7).
 */
async function uebernehmen(t: Turnier) {
  turnier.value = t
  versatzMs.value = Date.parse(t.serverZeit) - Date.now()
  if (t.status === 'laeuft' && t.meinNaechstesMatchId) {
    await router.push(`/spiel/${t.meinNaechstesMatchId}`)
  }
}

/**
 * Polling ohne since: Ein Turnier ist klein, und jeder Abruf schreibt es auf dem Server fort.
 * Nach dem Ende ändert sich nichts mehr, dann hört die Seite auf zu fragen.
 */
async function laden() {
  if (vorbei.value) return
  try {
    await uebernehmen(await turnierAbrufen(props.id))
    meldung.value = null
  } catch (e) {
    // Netzwerkfehler beim Polling: beim nächsten Tick erneut versuchen, Meldung bleibt stehen
    meldung.value = fehlertext(e)
  }
}

/** Nur der Host: Der Server mischt die Spieler, füllt mit dem Computer auf und legt Runde 1 an */
async function starten() {
  sendet.value = true
  try {
    await uebernehmen(await turnierStarten(props.id))
  } catch (e) {
    meldung.value = fehlertext(e)
  } finally {
    sendet.value = false
  }
}

async function verlassen() {
  sendet.value = true
  try {
    await turnierVerlassen(props.id)
    await router.push('/dashboard')
  } catch (e) {
    meldung.value = fehlertext(e)
  } finally {
    sendet.value = false
  }
}

const restSek = computed(() =>
  turnier.value?.codeEndeAm
    ? restSekunden(turnier.value.codeEndeAm, versatzMs.value, jetzt.value)
    : null,
)
const startbar = computed(() => (turnier.value?.teilnehmer.length ?? 0) >= TURNIER_MIN_START)
const computerText = computed(
  () => SCHWIERIGKEITEN.find((s) => s.wert === turnier.value?.schwierigkeit)?.text ?? '',
)

/**
 * Überschrift einer Paarung: in Runde 1 durchnummeriert, in Runde 2 nach Platz
 * platzUm: In Runde 2 spielen die Sieger um Platz 1/2, die Verlierer um Platz 3/4.
 */
function paarungTitel(p: Paarung, i: number): string {
  if (p.platzUm[0] === 1) return 'Finale (Platz 1 und 2)'
  if (p.platzUm[0] === 3) return 'Spiel um Platz 3'
  return `Match ${i + 1}`
}

/** Stand einer Paarung in Worten: Sieger, sobald es einen gibt, sonst der Match-Status */
function paarungStand(p: Paarung): string {
  if (p.siegerId) {
    const sieger = [p.spielerA, p.spielerB].find((s) => s.id === p.siegerId)
    return `Sieger: ${sieger?.name ?? ''}`
  }
  return STATUS_TEXT[p.status]
}

// Eigene Paarung bekommt einen blauen Rahmen
const istMeine = (p: Paarung) => [p.spielerA.id, p.spielerB.id].includes(meineId.value ?? '')

// Beim Öffnen: sofort laden, dann Uhr (1 s) und Polling (1,5 s) starten.
// Beim Verlassen der Seite: beide Timer stoppen, sonst liefen sie im Hintergrund weiter.
onMounted(() => {
  laden()
  uhr = setInterval(() => (jetzt.value = Date.now()), 1000)
  polling = setInterval(laden, POLL_MS)
})
onUnmounted(() => {
  clearInterval(uhr)
  clearInterval(polling)
})
</script>

<template>
  <section class="mx-auto max-w-md space-y-4">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h1 class="font-titel text-2xl">Turnier</h1>
      <p v-if="turnier" data-test="stand" class="text-slate-600">
        {{ turnierStandText(turnier) }}
      </p>
    </div>

    <p v-if="meldung" data-test="meldung" role="alert" class="text-sm text-red-600">
      {{ meldung }}
      <RouterLink to="/dashboard" class="underline">Zum Dashboard</RouterLink>
    </p>

    <p v-if="!turnier && !meldung" class="text-slate-600">Lade ...</p>

    <!-- Warteraum (ADR-010): Code weitergeben, Host startet ab drei Spielern -->
    <div
      v-if="turnier?.status === 'wartet'"
      data-test="warteraum"
      class="space-y-4 rounded-lg bg-white p-6 text-center shadow-lg"
    >
      <template v-if="istHost">
        <p class="text-sm text-slate-600">Gib deinen Mitspielern diesen Turnier-Code:</p>
        <p data-test="code" class="font-titel text-5xl tracking-widest select-all">
          {{ turnier.code }}
        </p>
        <p
          v-if="restSek !== null"
          data-test="code-countdown"
          class="text-sm tabular-nums"
          :class="restSek <= 60 ? 'text-red-600' : 'text-slate-600'"
        >
          Der Code gilt noch {{ zeitText(restSek) }}.
        </p>
      </template>

      <div class="text-left">
        <p class="font-medium">
          {{ turnier.teilnehmer.length }} von {{ turnier.groesse }} Spielern
        </p>
        <ul data-test="teilnehmer" class="mt-1 divide-y divide-slate-100">
          <li v-for="t in turnier.teilnehmer" :key="t.id" class="py-1">
            {{ t.name }}
            <span v-if="t.id === turnier.hostId" class="text-sm text-slate-500">(Host)</span>
            <span v-if="t.id === meineId" class="text-sm text-slate-500">(du)</span>
          </li>
        </ul>
      </div>

      <template v-if="istHost">
        <button
          type="button"
          data-test="turnier-starten"
          class="w-full rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          :disabled="sendet || !startbar"
          @click="starten"
        >
          Turnier starten
        </button>
        <p class="text-xs text-slate-500">
          Start ab {{ TURNIER_MIN_START }} Spielern. Fehlt der vierte, spielt ein Computer ({{
            computerText
          }}) mit.
        </p>
      </template>
      <p v-else data-test="warte-host" class="text-slate-600">Warte, bis der Host startet ...</p>

      <button
        type="button"
        data-test="verlassen"
        class="w-full rounded bg-slate-200 px-3 py-2 disabled:opacity-50"
        :disabled="sendet"
        @click="verlassen"
      >
        {{ istHost ? 'Turnier auflösen' : 'Warteraum verlassen' }}
      </button>
      <p v-if="istHost" class="text-xs text-slate-500">
        Verlässt du den Warteraum, endet das Turnier für alle.
      </p>
    </div>

    <!-- Übersicht: Paarungen und Stand für alle Teilnehmer -->
    <template v-else-if="turnier">
      <p
        v-if="turnier.status === 'laeuft' && !turnier.meinNaechstesMatchId"
        data-test="wartebildschirm"
        class="rounded-lg bg-white p-4 text-center shadow"
      >
        Dein Match ist vorbei. Warte, bis die anderen fertig sind. Die nächste Runde startet von
        selbst.
      </p>

      <div
        v-for="runde in turnier.runden"
        :key="runde.nr"
        data-test="runde"
        class="space-y-2 rounded-lg bg-white p-4 shadow"
      >
        <h2 class="font-titel text-lg">Runde {{ runde.nr }}</h2>
        <div
          v-for="(p, i) in runde.matches"
          :key="p.matchId"
          data-test="paarung"
          class="rounded border p-2 text-sm"
          :class="istMeine(p) ? 'border-blue-700' : 'border-slate-200'"
        >
          <p class="text-slate-500">{{ paarungTitel(p, i) }}</p>
          <p class="font-medium">{{ p.spielerA.name }} gegen {{ p.spielerB.name }}</p>
          <p class="text-slate-600">{{ paarungStand(p) }}</p>
        </div>
      </div>

      <!-- Platzierung erst am Ende (Klartext, Runde 2) -->
      <div
        v-if="turnier.status === 'beendet'"
        data-test="platzierung"
        class="rounded-lg bg-green-100 p-4 text-green-900"
      >
        <h2 class="font-titel text-lg">Platzierung</h2>
        <ol class="mt-1 space-y-1">
          <li v-for="p in turnier.platzierungen" :key="p.platz">
            {{ p.platz }}. {{ p.spieler.name }}
            <span v-if="p.spieler.id === meineId" class="text-sm">(du)</span>
          </li>
        </ol>
      </div>

      <p
        v-if="turnier.status === 'abgebrochen'"
        data-test="abgebrochen"
        class="rounded-lg bg-slate-200 p-4 text-center"
      >
        Das Turnier endete ohne Wertung. Gespielte Matches zählen trotzdem einzeln.
      </p>

      <RouterLink v-if="vorbei" to="/dashboard" class="inline-block underline">
        Zum Dashboard
      </RouterLink>
    </template>
  </section>
</template>
