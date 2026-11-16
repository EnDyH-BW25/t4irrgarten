<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { LabyrinthEntwurf, Mauer, Match, Zelle } from '@shared/types.ts'
import { MAX_MAUERN } from '@shared/types.ts'
import { ApiFehler, get, put } from '@/api'
import { SCHWIERIGKEITEN, STATUS_TEXT } from '@/anzeige'
import { mauerUmschalten, schatzSetzen } from '@/brett'
import { aufgeben } from '@/matches'
import LabyrinthFeld from '@/components/LabyrinthFeld.vue'

/** Kommt aus der URL /spiel/:id (props: true im Router) */
const props = defineProps<{ id: string }>()
const router = useRouter()

const match = ref<Match | null>(null)
const meldung = ref<string | null>(null)

/** Eigener Entwurf. Im Aufbau ist er führend: Ein Klick ändert ihn sofort (optimistisch). */
const entwurf = ref<LabyrinthEntwurf>({ schatz: null, mauern: [] })
/** Kurzer Hinweis am Feld, zum Beispiel bei der 31. Mauer */
const hinweis = ref<string | null>(null)
const speicherFehler = ref<string | null>(null)

/** Zählt die PUT-Anfragen. Nur die Antwort auf die neueste zählt (schnelle Klicks). */
let speicherNr = 0

const imAufbau = computed(
  () => match.value?.status === 'aufbau' && !match.value.ich.labyrinthGesetzt,
)
const restMauern = computed(() => MAX_MAUERN - entwurf.value.mauern.length)

function fehlertext(e: unknown) {
  return e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
}

async function laden() {
  try {
    match.value = await get<Match>(`/matches/${props.id}`)
    entwurf.value = match.value.meinLabyrinth ?? { schatz: null, mauern: [] }
  } catch (e) {
    meldung.value = fehlertext(e)
  }
}

/** Übernimmt einen neuen Entwurf sofort und speichert ihn danach beim Server */
async function aendern(neu: LabyrinthEntwurf) {
  entwurf.value = neu
  hinweis.value = null
  const nr = ++speicherNr
  try {
    const antwort = await put<Match>(`/matches/${props.id}/labyrinth`, neu)
    // Eine ältere Antwort, die erst jetzt eintrifft, wird verworfen
    if (nr === speicherNr) {
      match.value = antwort
      speicherFehler.value = null
    }
  } catch (e) {
    if (nr === speicherNr) speicherFehler.value = `Nicht gespeichert: ${fehlertext(e)}`
  }
}

function mauerKlick(mauer: Mauer) {
  const neu = mauerUmschalten(entwurf.value, mauer)
  if (neu) aendern(neu)
  else hinweis.value = `Alle ${MAX_MAUERN} Mauern sind verbaut. Entferne zuerst eine.`
}

function zelleKlick(zelle: Zelle) {
  const neu = schatzSetzen(entwurf.value, zelle)
  if (neu) aendern(neu)
  else hinweis.value = 'Auf A1 startet dein Gegner. Leg den Schatz auf ein anderes Feld.'
}

async function aufgebenKlicken() {
  try {
    await aufgeben(props.id)
    await router.push('/dashboard')
  } catch (e) {
    meldung.value = fehlertext(e)
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
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="font-titel text-2xl">Spiel gegen den Computer</h1>
        <p data-test="status" class="text-slate-600">
          {{ STATUS_TEXT[match.status] }}
          <template v-if="match.schwierigkeit">
            · {{ SCHWIERIGKEITEN.find((s) => s.wert === match!.schwierigkeit)?.text }}
          </template>
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Links: mein Irrgarten. Im Spiel erscheint hier die Spur des Gegners. -->
        <div class="space-y-2">
          <h2 class="font-titel text-lg">Dein Irrgarten</h2>
          <LabyrinthFeld
            art="eigen"
            :mauern="entwurf.mauern"
            :markierte-mauern="match.pruefung?.problematischeMauern ?? []"
            :schatz="entwurf.schatz"
            :figur="imAufbau ? null : (match.gegnerKarte?.position ?? null)"
            :besucht="imAufbau ? [] : (match.gegnerKarte?.besuchteZellen ?? [])"
            :bearbeitbar="imAufbau"
            @mauer="mauerKlick"
            @zelle="zelleKlick"
          />
          <template v-if="imAufbau">
            <p data-test="rest-mauern" class="text-sm">
              Noch {{ restMauern }} von {{ MAX_MAUERN }} Mauern
            </p>
            <p class="text-sm text-slate-600">
              Klick zwischen zwei Felder setzt oder entfernt eine Mauer. Klick auf ein Feld legt den
              Schatz.
            </p>
            <p v-if="match.pruefung?.meldung" data-test="pruefung" class="text-sm">
              {{ match.pruefung.meldung }}
            </p>
          </template>
          <p v-if="hinweis" data-test="hinweis" class="text-sm text-orange-700">{{ hinweis }}</p>
          <p
            v-if="speicherFehler"
            data-test="speicher-fehler"
            role="alert"
            class="text-sm text-red-600"
          >
            {{ speicherFehler }}
          </p>
        </div>

        <!-- Rechts: Irrgarten des Gegners mit meiner Suche -->
        <div class="space-y-2">
          <h2 class="font-titel text-lg">Irrgarten des Gegners</h2>
          <LabyrinthFeld
            art="gegner"
            :mauern="match.bekannteKarte.entdeckteMauern"
            :figur="match.bekannteKarte.position"
            :besucht="match.bekannteKarte.besuchteZellen"
          />
        </div>
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
