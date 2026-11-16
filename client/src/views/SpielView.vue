<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type {
  AnfrageAntwort,
  AnfrageErgebnis,
  BekannteKarte,
  LabyrinthEntwurf,
  Mauer,
  Match,
  Zelle,
} from '@shared/types.ts'
import { MAX_MAUERN } from '@shared/types.ts'
import { abfragen, ApiFehler, get, post, put } from '@/api'
import { antwortText, ENDEGRUND_TEXT, SCHWIERIGKEITEN, STATUS_TEXT } from '@/anzeige'
import { nutzer } from '@/anmeldung'
import { geradeZiele, mauerUmschalten, schatzSetzen, spurFortschreiben } from '@/brett'
import { POLL_MS, restSekunden, zeitText, ZUG_PAUSE_MS } from '@/countdown'
import { aufgeben } from '@/matches'
import LabyrinthFeld from '@/components/LabyrinthFeld.vue'

/** Kommt aus der URL /spiel/:id (props: true im Router) */
const props = defineProps<{ id: string }>()
const router = useRouter()

const match = ref<Match | null>(null)
const meldung = ref<string | null>(null)

// ---------- Aufbau ----------

/** Eigener Entwurf. Im Aufbau ist er führend: Ein Klick ändert ihn sofort (optimistisch). */
const entwurf = ref<LabyrinthEntwurf>({ schatz: null, mauern: [] })
/** Kurzer Hinweis am Feld, zum Beispiel bei der 31. Mauer */
const hinweis = ref<string | null>(null)
const speicherFehler = ref<string | null>(null)

/** Zählt die PUT-Anfragen. Nur die Antwort auf die neueste zählt (schnelle Klicks). */
let speicherNr = 0
/** Zahl der laufenden Speicherungen; solange eine läuft, übernimmt das Polling nichts */
let offeneSpeicherungen = 0
/** Die zuletzt gestartete Speicherung. "Irrgarten setzen" wartet auf sie. */
let letzteSpeicherung: Promise<void> = Promise.resolve()

const setzt = ref(false)
const setzFehler = ref<string | null>(null)

// ---------- Spiel ----------

/** Fragt gerade, damit ein Doppelklick keine zweite Anfrage mit derselben Nummer schickt */
const fragt = ref(false)
/** Während der Zug des Computers abläuft, zeigt das linke Feld diese Zwischenstände */
const abspielKarte = ref<BekannteKarte | null>(null)
/** Verlauf der Anfragen, neueste oben */
const verlauf = ref<string[]>([])

// ---------- Zeit ----------

/** Serverzeit minus Browserzeit; gleicht eine falsch gehende Uhr im Browser aus */
const versatzMs = ref(0)
/** Tickt jede Sekunde, damit der Countdown sich neu berechnet */
const jetzt = ref(Date.now())
let uhr: ReturnType<typeof setInterval> | undefined
let polling: ReturnType<typeof setInterval> | undefined
let fragtAb = false

// ---------- Abgeleitete Werte ----------

const imAufbau = computed(
  () => match.value?.status === 'aufbau' && !match.value.ich.labyrinthGesetzt,
)
const vorbei = computed(
  () => match.value?.status === 'beendet' || match.value?.status === 'abgebrochen',
)
const meineId = computed(
  () => nutzer.value?.id ?? match.value?.spieler.find((s) => !s.istComputer)?.id,
)
const ichBinDran = computed(
  () => match.value?.status === 'laeuft' && match.value.amZug === meineId.value,
)
const restMauern = computed(() => MAX_MAUERN - entwurf.value.mauern.length)

/** Restzeit des Aufbaus in Sekunden oder null, wenn keine Frist läuft */
const restSek = computed(() => {
  const ende = match.value?.aufbauEndeAm
  return ende ? restSekunden(ende, versatzMs.value, jetzt.value) : null
})

/** Felder im Gegner-Labyrinth, die ich gerade anfragen darf */
const ziele = computed<Zelle[]>(() =>
  ichBinDran.value && !fragt.value && !abspielKarte.value && match.value
    ? geradeZiele(match.value.bekannteKarte.position)
    : [],
)

/** Spur des Gegners auf meinem Feld: während der Wiedergabe der Zwischenstand */
const gegnerSpur = computed(() => abspielKarte.value ?? match.value?.gegnerKarte ?? null)

const zugText = computed(() => {
  if (!match.value || match.value.status !== 'laeuft') return null
  if (abspielKarte.value) return 'Der Computer sucht ...'
  return ichBinDran.value
    ? 'Du bist am Zug. Wähle ein Feld im Irrgarten des Gegners.'
    : 'Der Computer ist am Zug.'
})

// ---------- Hilfen ----------

/** Jede Antwort mit Match läuft hierüber, damit der Uhrversatz aktuell bleibt */
function uebernehmen(m: Match) {
  match.value = m
  versatzMs.value = Date.parse(m.serverZeit) - Date.now()
}

function fehlertext(e: unknown) {
  return e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
}

const warten = (ms: number) => new Promise((fertig) => setTimeout(fertig, ms))

// ---------- Laden und Polling ----------

async function laden() {
  try {
    const geladen = await get<Match>(`/matches/${props.id}`)
    uebernehmen(geladen)
    entwurf.value = geladen.meinLabyrinth ?? { schatz: null, mauern: [] }
  } catch (e) {
    meldung.value = fehlertext(e)
  }
}

/**
 * Fragt regelmäßig nach dem Stand. Mit since antwortet der Server 304, wenn sich nichts geändert
 * hat; abfragen() liefert dann null. Nach Spielende hört das Polling auf.
 */
async function abfrageTick() {
  if (!match.value || fragtAb) return
  if (vorbei.value) return clearInterval(polling)
  // Eigene Änderungen sind unterwegs: Ihre Antwort ist neuer als jeder Abruf
  if (offeneSpeicherungen > 0 || fragt.value || abspielKarte.value) return
  fragtAb = true
  try {
    const neu = await abfragen<Match>(`/matches/${props.id}`, match.value.version)
    if (neu && neu.version > match.value.version) uebernehmen(neu)
  } catch {
    // Netz kurz weg: Der nächste Abruf versucht es wieder
  } finally {
    fragtAb = false
  }
}

// ---------- Aufbau: Entwurf bearbeiten und setzen ----------

/** Übernimmt einen neuen Entwurf sofort und speichert ihn danach beim Server */
function aendern(neu: LabyrinthEntwurf) {
  entwurf.value = neu
  hinweis.value = null
  setzFehler.value = null
  letzteSpeicherung = speichern(neu)
}

async function speichern(neu: LabyrinthEntwurf) {
  const nr = ++speicherNr
  offeneSpeicherungen++
  try {
    const antwort = await put<Match>(`/matches/${props.id}/labyrinth`, neu)
    // Eine ältere Antwort, die erst jetzt eintrifft, wird verworfen
    if (nr === speicherNr) {
      uebernehmen(antwort)
      speicherFehler.value = null
    }
  } catch (e) {
    if (nr === speicherNr) speicherFehler.value = `Nicht gespeichert: ${fehlertext(e)}`
  } finally {
    offeneSpeicherungen--
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

/** "Irrgarten setzen": Der Server prüft den gespeicherten Entwurf und startet das Spiel */
async function setzen() {
  setzt.value = true
  setzFehler.value = null
  try {
    // Erst warten, bis der letzte Klick gespeichert ist. Sonst prüft der Server einen alten Stand.
    await letzteSpeicherung
    if (speicherFehler.value) {
      // Letzte Speicherung fehlgeschlagen: noch einmal versuchen, sonst nicht setzen
      aendern(entwurf.value)
      await letzteSpeicherung
      if (speicherFehler.value) return
    }
    const gestartet = await post<Match>(`/matches/${props.id}/labyrinth/place`)
    uebernehmen(gestartet)
    // Hat der Computer die Auslosung gewonnen, ist sein erster Zug schon gespielt
    if (gestartet.status !== 'aufbau' && gestartet.anfrageNr > 1) {
      verlauf.value.unshift('Der Computer hat die Auslosung gewonnen und ist schon gezogen.')
    } else if (gestartet.status === 'laeuft') {
      verlauf.value.unshift('Du hast die Auslosung gewonnen und beginnst.')
    }
  } catch (e) {
    // 422: Schatz fehlt oder ist nicht erreichbar. Die Mauern markiert schon die Prüfung.
    setzFehler.value = fehlertext(e)
  } finally {
    setzt.value = false
  }
}

// ---------- Spiel: Anfragen ----------

/** Klick auf ein Feld im Gegner-Labyrinth */
async function anfragen(ziel: Zelle) {
  if (!match.value || fragt.value) return
  fragt.value = true
  hinweis.value = null
  const vorher = match.value.gegnerKarte
  try {
    const antwort = await post<AnfrageAntwort>(`/matches/${props.id}/queries`, {
      anfrageNr: match.value.anfrageNr,
      ziel,
    })
    verlauf.value.unshift(`Du: ${ziel}, ${antwortText(antwort)}`)
    uebernehmen(antwort.match)
    if (antwort.computerAnfragen?.length && vorher) {
      await computerAbspielen(vorher, antwort.computerAnfragen)
    }
  } catch (e) {
    hinweis.value = fehlertext(e)
    // 409: Der Stand auf dem Server ist ein anderer, zum Beispiel nach einem Doppelklick
    if (e instanceof ApiFehler && e.status === 409) await laden()
  } finally {
    fragt.value = false
  }
}

/** Spielt den Zug des Computers Anfrage für Anfrage auf meinem Feld ab */
async function computerAbspielen(start: BekannteKarte, anfragenListe: AnfrageErgebnis[]) {
  let karte = start
  abspielKarte.value = karte
  for (const a of anfragenListe) {
    await warten(ZUG_PAUSE_MS)
    karte = spurFortschreiben(karte, a)
    abspielKarte.value = karte
    verlauf.value.unshift(`Computer: ${a.ziel}, ${antwortText(a)}`)
  }
  // Am Ende gilt wieder der Stand des Servers
  abspielKarte.value = null
}

async function aufgebenKlicken() {
  try {
    uebernehmen(await aufgeben(props.id))
    await router.push('/dashboard')
  } catch (e) {
    meldung.value = fehlertext(e)
  }
}

onMounted(() => {
  laden()
  uhr = setInterval(() => (jetzt.value = Date.now()), 1000)
  polling = setInterval(abfrageTick, POLL_MS)
})
onUnmounted(() => {
  clearInterval(uhr)
  clearInterval(polling)
})
</script>

<template>
  <section class="space-y-4">
    <p v-if="meldung" data-test="meldung" role="alert" class="text-red-600">
      {{ meldung }}
      <RouterLink to="/dashboard" class="underline">Zum Dashboard</RouterLink>
    </p>

    <template v-else-if="match">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p
          v-if="restSek !== null && match.status === 'aufbau'"
          data-test="countdown"
          class="font-titel text-3xl tabular-nums"
          :class="restSek <= 30 ? 'text-red-600' : ''"
          title="Restzeit für den Aufbau"
        >
          {{ zeitText(restSek) }}
        </p>
        <h1 class="font-titel text-2xl">Spiel gegen den Computer</h1>
        <p data-test="status" class="text-slate-600">
          {{ STATUS_TEXT[match.status] }}
          <template v-if="match.schwierigkeit">
            · {{ SCHWIERIGKEITEN.find((s) => s.wert === match!.schwierigkeit)?.text }}
          </template>
        </p>
      </div>

      <!-- Spielende -->
      <div
        v-if="vorbei"
        data-test="ergebnis"
        class="rounded-lg p-4 text-center"
        :class="
          match.siegerId === meineId ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
        "
      >
        <p class="font-titel text-2xl">
          {{ match.siegerId === meineId ? 'Gewonnen!' : 'Verloren' }}
        </p>
        <p v-if="match.endegrund" class="text-sm">{{ ENDEGRUND_TEXT[match.endegrund] }}</p>
        <RouterLink to="/dashboard" class="mt-2 inline-block underline">Zum Dashboard</RouterLink>
      </div>

      <p v-else-if="zugText" data-test="zug" class="font-medium">{{ zugText }}</p>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Links: mein Irrgarten. Im Spiel erscheint hier die Spur des Gegners. -->
        <div class="space-y-2">
          <h2 class="font-titel text-lg">Dein Irrgarten</h2>
          <LabyrinthFeld
            art="eigen"
            :mauern="entwurf.mauern"
            :markierte-mauern="match.pruefung?.problematischeMauern ?? []"
            :schatz="entwurf.schatz"
            :figur="imAufbau ? null : (gegnerSpur?.position ?? null)"
            :besucht="imAufbau ? [] : (gegnerSpur?.besuchteZellen ?? [])"
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
            <p
              data-test="pruefung"
              class="rounded px-3 py-2 text-sm"
              :class="
                match.pruefung?.loesbar === true
                  ? 'bg-green-100 text-green-800'
                  : match.pruefung?.loesbar === false
                    ? 'bg-red-100 text-red-800'
                    : 'bg-slate-200 text-slate-700'
              "
            >
              <template v-if="match.pruefung?.loesbar === true">
                {{ match.pruefung.meldung }}
              </template>
              <template v-else-if="match.pruefung?.loesbar === false">
                {{ match.pruefung.meldung }}. Die rot markierten Mauern versperren den Weg.
              </template>
              <template v-else>Leg deinen Schatz auf ein Feld.</template>
            </p>
            <button
              type="button"
              data-test="setzen"
              class="w-full rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
              :disabled="setzt || match.pruefung?.loesbar !== true"
              @click="setzen"
            >
              {{ setzt ? 'Bitte warten ...' : 'Irrgarten setzen' }}
            </button>
            <p v-if="setzFehler" data-test="setz-fehler" role="alert" class="text-sm text-red-600">
              {{ setzFehler }}
            </p>
          </template>
          <p
            v-else-if="match.status === 'aufbau'"
            data-test="gesetzt"
            class="text-sm text-slate-600"
          >
            Dein Irrgarten steht.
          </p>
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

        <!-- Rechts: Irrgarten des Gegners mit meiner Suche; nach Spielende ganz aufgedeckt -->
        <div class="space-y-2">
          <h2 class="font-titel text-lg">Irrgarten des Gegners</h2>
          <LabyrinthFeld
            art="gegner"
            :mauern="match.gegnerLabyrinth?.mauern ?? match.bekannteKarte.entdeckteMauern"
            :schatz="match.gegnerLabyrinth?.schatz ?? null"
            :figur="match.bekannteKarte.position"
            :besucht="match.bekannteKarte.besuchteZellen"
            :ziele="ziele"
            @zelle="anfragen"
          />
        </div>
      </div>

      <!-- Verlauf der Anfragen, neueste oben -->
      <ol v-if="verlauf.length" data-test="verlauf" class="space-y-1 text-sm">
        <li v-for="(eintrag, i) in verlauf" :key="verlauf.length - i">{{ eintrag }}</li>
      </ol>

      <button
        v-if="!vorbei"
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
