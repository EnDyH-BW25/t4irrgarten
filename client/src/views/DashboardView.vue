<!--
  DASHBOARDVIEW (Route /dashboard): Startpunkt nach der Anmeldung
  Zeigt genau einen von drei Blöcken (v-if / v-else-if / v-else):
  1. Laufendes Spiel: Fortsetzen oder Aufgeben
  2. Laufendes Turnier: zur Turnierseite
  3. Sonst: Neues Spiel (Computer, Duell erstellen/beitreten) oder Neues Turnier
  Darunter Statistik (Siege, Niederlagen, Quote) und die letzten 10 Spiele.
  Regel: Ein Nutzer hat höchstens ein offenes Match oder Turnier. Der Server sperrt mit 409.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Ergebnis, Match, Schwierigkeit, Statistik, Turnier } from '@shared/types.ts'
import { ApiFehler } from '@/api'
import { nutzer } from '@/anmeldung'
import {
  SCHWIERIGKEITEN,
  STATUS_TEXT,
  datumText,
  gegnerText,
  quoteText,
  turnierStandText,
} from '@/anzeige'
import { ergebnisseLaden, statistikLaden } from '@/ergebnisse'
import { aufgeben, beitreten, duellAnlegen, matchAnlegen, offenesMatch } from '@/matches'
import { offenesTurnier, turnierAnlegen, turnierBeitreten } from '@/turniere'

const router = useRouter()

// Vorgewählt ist die zuletzt gespielte Schwierigkeit aus dem Account (ADR-027)
const schwierigkeit = ref<Schwierigkeit>(nutzer.value?.schwierigkeit ?? 'standard')

/** Offenes Match des Nutzers; null heißt: Er kann ein neues starten */
const laufend = ref<Match | null>(null)
/** Wartendes oder laufendes Turnier; sperrt neue Spiele auch zwischen zwei Runden */
const turnier = ref<Turnier | null>(null)
const laedt = ref(true) // true von Anfang an: Erst nach dem Laden ist klar, welcher Block passt
/** Welche Auswahl unter "Neues Spiel" offen ist (aufklappbare Menüs, nur Anzeige) */
const auswahlOffen = ref(false)
const liveOffen = ref(false)
const beitretenOffen = ref(false)
/** Eingabe im Feld "Spielcode" */
const code = ref('')
/** Auswahl und Code unter "Neues Turnier"; getrennt vom Duell, damit die Felder nicht verwechseln */
const turnierOffen = ref(false)
const turnierBeitretenOffen = ref(false)
const turnierCode = ref('')
const sendet = ref(false) // sperrt alle Start-Buttons während eines Requests
const meldung = ref<string | null>(null)

/** Gemeinsame Fehlerausgabe: Text vom Server oder allgemeiner Text */
function fehlerZeigen(e: unknown) {
  meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
}

/** Statistik und letzte Spiele; null, solange sie nicht geladen sind */
const statistik = ref<Statistik | null>(null)
const letzte = ref<Ergebnis[]>([])

/**
 * Lädt alles für das Dashboard. Die Reihenfolge ist Absicht (ADR-033):
 * erst Match, dann Turnier (beide nacheinander), dann Statistik und Liste (parallel).
 */
async function laden() {
  laedt.value = true
  meldung.value = null
  try {
    // Erst das offene Match: Der Abruf trägt abgelaufene Fristen nach (ADR-028).
    // Endete dabei ein Match, steht sein Ergebnis danach schon in der Statistik.
    laufend.value = await offenesMatch()
    // Danach das Turnier: Der Abruf legt fällige Runden an und trägt die Platzierung ein
    turnier.value = await offenesTurnier()
    // Promise.all: beide Requests gleichzeitig starten und auf beide warten (spart Zeit).
    // [s, l] = Destructuring: erstes Ergebnis in s, zweites in l
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
 * Gemeinsamer Ablauf für alle Wege ins Spiel: Server fragen, danach zur Seite, deren Pfad
 * `anlegen` liefert. Im Duell zeigt die Spielansicht zuerst den Warteraum, im Turnier die
 * Turnierseite.
 * `anlegen` ist eine Funktion als Parameter (Callback). So steht try/catch, Sperre und
 * 409-Behandlung nur einmal hier, statt fünfmal in jeder Start-Funktion (DRY).
 */
async function starten(anlegen: () => Promise<string>, meldungBei409 = false) {
  sendet.value = true
  meldung.value = null
  try {
    await router.push(await anlegen())
  } catch (e) {
    // 409: Es gibt doch ein offenes Match, zum Beispiel aus einem anderen Tab
    if (e instanceof ApiFehler && e.status === 409) {
      await laden()
      // Beim Beitreten muss der Spieler wissen, warum es nicht geklappt hat.
      // laden() löscht die Meldung, darum steht sie erst danach.
      if (meldungBei409) fehlerZeigen(e)
    }
    // Sonst steht die Meldung des Servers da, zum Beispiel "Der Spielcode ist ungültig ..."
    else fehlerZeigen(e)
  } finally {
    sendet.value = false
  }
}

// Die fünf Wege ins Spiel. Jeder liefert nur den Zielpfad, den Rest erledigt starten().
function gegenComputerStarten() {
  return starten(async () => {
    const match = await matchAnlegen(schwierigkeit.value)
    // Der Server hat sich die Wahl gemerkt; lokal nachziehen spart einen Abruf von /auth/me
    if (nutzer.value) nutzer.value.schwierigkeit = schwierigkeit.value
    return `/spiel/${match.id}`
  })
}

function duellErstellen() {
  return starten(async () => `/spiel/${(await duellAnlegen()).id}`)
}

// true: Beim Beitreten auch bei 409 eine Meldung zeigen (z. B. Duell schon voll)
function duellBeitreten() {
  return starten(async () => `/spiel/${(await beitreten(code.value)).id}`, true)
}

/** Der Host gibt die Schwierigkeit mit; sie gilt nur für einen auffüllenden Computer (ADR-010) */
function turnierErstellen() {
  return starten(async () => `/turnier/${(await turnierAnlegen(schwierigkeit.value)).id}`)
}

function turnierCodeSenden() {
  return starten(async () => `/turnier/${(await turnierBeitreten(turnierCode.value)).id}`)
}

/** Erst bei fünf Zeichen lohnt der Versuch; den Rest prüft der Server */
const codeVollstaendig = computed(() => code.value.trim().length === 5)
const turnierCodeVollstaendig = computed(() => turnierCode.value.trim().length === 5)

/** Gegner des offenen Matches in Worten */
const laufendGegner = computed(() => {
  const m = laufend.value
  if (!m) return ''
  if (m.status === 'wartet') return 'Duell im Warteraum'
  if (m.competitionId) return 'Turnier-Match'
  if (m.modus === 'computer') return 'Gegen den Computer'
  const gegner = m.spieler.find((s) => s.id !== nutzer.value?.id) // der Spieler, der nicht ich bin
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

    <!-- Dropdown: v-model hält die Auswahl im ref schwierigkeit -->
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

    <!-- Offenes Turnier ohne laufendes Match: Warteraum oder Wartebildschirm zwischen Runden -->
    <div v-else-if="turnier" data-test="laufendes-turnier" class="rounded-lg bg-white p-4 shadow">
      <h2 class="font-titel text-lg">Laufendes Turnier</h2>
      <p class="mt-1 text-sm text-slate-600">{{ turnierStandText(turnier) }}</p>
      <button
        type="button"
        data-test="zum-turnier"
        class="mt-3 w-full rounded bg-blue-700 px-3 py-2 text-white"
        @click="router.push(`/turnier/${turnier.id}`)"
      >
        Zum Turnier
      </button>
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

      <!-- Code-Eingabe: maxlength 5, uppercase nur optisch; der Server normiert die Schreibweise -->
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

      <!-- Turnier: erstellen (Host) oder mit Code beitreten (ADR-010) -->
      <button
        type="button"
        data-test="neues-turnier"
        class="w-full rounded bg-blue-700 px-3 py-2 text-white"
        @click="turnierOffen = !turnierOffen"
      >
        Neues Turnier
      </button>
      <div v-if="turnierOffen" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-test="turnier-erstellen"
          class="rounded bg-orange-300 px-3 py-2 disabled:opacity-50"
          :disabled="sendet"
          @click="turnierErstellen"
        >
          Turnier erstellen
        </button>
        <button
          type="button"
          data-test="turnier-beitreten"
          class="rounded bg-orange-300 px-3 py-2 disabled:opacity-50"
          :disabled="sendet"
          @click="turnierBeitretenOffen = !turnierBeitretenOffen"
        >
          Turnier beitreten
        </button>
      </div>
      <p v-if="turnierOffen" class="text-xs text-slate-500">
        Fehlt ein Spieler, füllt ein Computer mit der gewählten Schwierigkeit auf.
      </p>
      <form
        v-if="turnierOffen && turnierBeitretenOffen"
        class="flex gap-2"
        @submit.prevent="turnierCodeSenden"
      >
        <input
          v-model="turnierCode"
          data-test="turnier-code"
          aria-label="Turnier-Code"
          placeholder="Turnier-Code, z. B. H3R8W"
          maxlength="5"
          autocomplete="off"
          class="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 uppercase"
        />
        <button
          type="submit"
          data-test="turnier-code-senden"
          class="rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          :disabled="sendet || !turnierCodeVollstaendig"
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
      <!-- Vollständige Liste mit Details auf eigener Seite (Klartext, Abschnitt Ergebnisse) -->
      <button
        type="button"
        data-test="ergebnisse"
        class="mt-3 w-full rounded bg-slate-200 px-3 py-2"
        @click="router.push('/ergebnisse')"
      >
        Ergebnisse
      </button>
    </div>
  </section>
</template>
