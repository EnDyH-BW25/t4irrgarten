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
import { ANFRAGE_ANZEIGE_MS, ANTWORT_ANZEIGE_MS, MAX_MAUERN } from '@shared/types.ts'
import { abfragen, ApiFehler, get, post, put } from '@/api'
import { ANTWORT_FARBE, antwortText, ENDEGRUND_TEXT, SCHWIERIGKEITEN, STATUS_TEXT } from '@/anzeige'
import { nutzer } from '@/anmeldung'
import { geradeZiele, mauerUmschalten, schatzSetzen, spurFortschreiben } from '@/brett'
import { POLL_MS, restSekunden, zeitText } from '@/countdown'
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

// ---------- Bereitschaft ----------

/** "Spiel starten" ist unterwegs */
const startet = ref(false)
const startFehler = ref<string | null>(null)

// ---------- Spiel ----------

/** Fragt gerade, damit ein Doppelklick keine zweite Anfrage mit derselben Nummer schickt */
const fragt = ref(false)
/** Während der Zug des Computers abläuft, zeigt das linke Feld diese Zwischenstände */
const abspielKarte = ref<BekannteKarte | null>(null)
/** Wer die Auslosung gewonnen hat; steht in der Anfragebox bis zur ersten Anfrage */
const auslosung = ref<string | null>(null)
/** Zählt die Antworten, damit jedes neue Etikett seine Animation abspielt */
const antwortNr = ref(0)

/**
 * Inhalt der Anfragebox (ADR-037): erst nur die Anfrage, nach einer Pause auch die Antwort.
 * feld sagt, in welchem Irrgarten das Zielfeld blinkt.
 */
type Anzeige = {
  wer: string
  ziel: Zelle
  antwort: AnfrageErgebnis | null
  feld: 'eigen' | 'gegner'
}
const anzeige = ref<Anzeige | null>(null)
/** Hält meine letzte Antwort lesbar: Die Wiedergabe des Gegners wartet darauf */
let antwortLesbar: Promise<unknown> = Promise.resolve()

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

/** Name des Gegners für alle Texte; im Warteraum gibt es noch keinen */
const gegnerName = computed(
  () => match.value?.spieler.find((s) => s.id !== meineId.value)?.name ?? 'Der Gegner',
)
const istDuell = computed(() => match.value?.modus === 'duell')

const titel = computed(() => {
  if (!istDuell.value) return 'Spiel gegen den Computer'
  return match.value?.status === 'wartet' ? 'Duell' : `Duell gegen ${gegnerName.value}`
})

/** Live-Kasten im Duell: Anfragen des Gegners, neueste oben */
const gegnerZuege = computed(() => [...(match.value?.gegnerAnfragen ?? [])].reverse())

/**
 * Die Frist, die gerade zählt: Aufbau oder Nachbesserung, Bereitschaft oder Zug.
 * rotAb nennt die Sekunden, ab denen der Countdown rot wird.
 */
const frist = computed<{ ende: string; titel: string; rotAb: number } | null>(() => {
  const m = match.value
  if (!m) return null
  if (m.status === 'wartet' && m.codeEndeAm) {
    return { ende: m.codeEndeAm, titel: 'So lange gilt der Spielcode', rotAb: 60 }
  }
  if (m.status === 'aufbau') {
    if (m.ich.nachbesserungEndeAm) {
      return { ende: m.ich.nachbesserungEndeAm, titel: 'Restzeit zum Nachbessern', rotAb: 30 }
    }
    if (m.gegner?.nachbesserungEndeAm) {
      return { ende: m.gegner.nachbesserungEndeAm, titel: 'Der Gegner bessert nach', rotAb: 0 }
    }
    return m.aufbauEndeAm
      ? { ende: m.aufbauEndeAm, titel: 'Restzeit für den Aufbau', rotAb: 30 }
      : null
  }
  if (m.status === 'startbereit' && m.startFristEndeAm) {
    return { ende: m.startFristEndeAm, titel: 'Zeit für die Bereitschaft', rotAb: 10 }
  }
  if (m.status === 'laeuft' && m.zugEndeAm) {
    const titel = m.amZug === meineId.value ? 'Deine Bedenkzeit' : 'Bedenkzeit des Gegners'
    return { ende: m.zugEndeAm, titel, rotAb: 10 }
  }
  return null
})

/** Restzeit der laufenden Frist in Sekunden oder null, wenn keine läuft */
const restSek = computed(() =>
  frist.value ? restSekunden(frist.value.ende, versatzMs.value, jetzt.value) : null,
)

/** Felder im Gegner-Labyrinth, die ich gerade anfragen darf */
const ziele = computed<Zelle[]>(() =>
  ichBinDran.value && !fragt.value && !abspielKarte.value && match.value
    ? geradeZiele(match.value.bekannteKarte.position)
    : [],
)

/** Spur des Gegners auf meinem Feld: während der Wiedergabe der Zwischenstand */
const gegnerSpur = computed(() => abspielKarte.value ?? match.value?.gegnerKarte ?? null)

const zugText = computed(() => {
  if (!match.value) return null
  if (abspielKarte.value) return `${gegnerName.value} sucht ...`
  if (match.value.status !== 'laeuft') return null
  return ichBinDran.value
    ? 'Du bist am Zug. Wähle ein Feld im Irrgarten des Gegners.'
    : `${gegnerName.value} ist am Zug.`
})

// ---------- Hilfen ----------

/** Jede Antwort mit Match läuft hierüber, damit der Uhrversatz aktuell bleibt */
function uebernehmen(m: Match) {
  match.value = m
  versatzMs.value = Date.parse(m.serverZeit) - Date.now()
  // Nach dem Setzen gilt das Labyrinth des Servers. Hat er bei Fristende einen Schatz gelegt
  // oder Mauern geöffnet, zeigt das Feld es so. Im Aufbau bleibt der eigene Entwurf führend.
  const bearbeitbar = m.status === 'aufbau' && !m.ich.labyrinthGesetzt
  if (!bearbeitbar && m.meinLabyrinth) entwurf.value = m.meinLabyrinth
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
  const alt = match.value
  // Eigene Änderungen sind unterwegs: Ihre Antwort ist neuer als jeder Abruf.
  // Während der Wiedergabe des Computerzugs fragt der Client weiter ab. Jeder Abruf ist ein
  // Lebenszeichen, und eine lange Wiedergabe dauert mehr als die 15 Sekunden der Abruffrist.
  if (offeneSpeicherungen > 0 || fragt.value) return
  fragtAb = true
  try {
    const neu = await abfragen<Match>(`/matches/${props.id}`, match.value.version)
    if (neu && neu.version > alt.version) {
      uebernehmen(neu)
      if (istDuell.value) gegnerNachspielen(alt, neu)
    }
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
    // Danach ist das Match startbereit, das Overlay fragt nach der Bereitschaft
    uebernehmen(await post<Match>(`/matches/${props.id}/labyrinth/place`))
  } catch (e) {
    // 422: Schatz fehlt oder ist nicht erreichbar. Die Mauern markiert schon die Prüfung.
    setzFehler.value = fehlertext(e)
  } finally {
    setzt.value = false
  }
}

// ---------- Bereitschaft ----------

/** "Spiel starten" im Overlay. Sind alle bereit, lost der Server aus, wer beginnt. */
async function starten() {
  startet.value = true
  startFehler.value = null
  try {
    const gestartet = await post<Match>(`/matches/${props.id}/ready`)
    uebernehmen(gestartet)
    // Hat der Computer die Auslosung gewonnen, ist sein erster Zug schon gespielt
    if (gestartet.status !== 'laeuft') return
    if (gestartet.amZug === meineId.value) {
      auslosung.value = 'Du hast die Auslosung gewonnen und beginnst.'
    } else if (gestartet.anfrageNr > 1) {
      auslosung.value = 'Der Computer hat die Auslosung gewonnen und ist schon gezogen.'
    } else {
      auslosung.value = `${gegnerName.value} hat die Auslosung gewonnen und beginnt.`
    }
  } catch (e) {
    startFehler.value = fehlertext(e)
    // 409: Die Startfrist ist schon abgelaufen; der neue Stand zeigt das Ergebnis
    if (e instanceof ApiFehler && e.status === 409) await laden()
  } finally {
    startet.value = false
  }
}

// ---------- Spiel: Anfragen ----------

/** Klick auf ein Feld im Gegner-Labyrinth */
async function anfragen(ziel: Zelle) {
  if (!match.value || fragt.value) return
  fragt.value = true
  hinweis.value = null
  const vorher = match.value.gegnerKarte
  let computerZug: AnfrageErgebnis[] = []
  // Die Anfrage erscheint sofort in der Box, die Antwort erst nach der Pause
  anzeige.value = { wer: 'Du', ziel, antwort: null, feld: 'gegner' }
  try {
    const [antwort] = await Promise.all([
      post<AnfrageAntwort>(`/matches/${props.id}/queries`, {
        anfrageNr: match.value.anfrageNr,
        ziel,
      }),
      warten(ANFRAGE_ANZEIGE_MS),
    ])
    anzeige.value = { ...anzeige.value, antwort }
    // Wechselt der Zug, überschreibt die Anfrage des Gegners sonst sofort meine Antwort
    antwortLesbar = warten(ANTWORT_ANZEIGE_MS)
    antwortNr.value++
    uebernehmen(antwort.match)
    computerZug = antwort.computerAnfragen ?? []
  } catch (e) {
    anzeige.value = null
    hinweis.value = fehlertext(e)
    // 409: Der Stand auf dem Server ist ein anderer, zum Beispiel nach einem Doppelklick
    if (e instanceof ApiFehler && e.status === 409) await laden()
  } finally {
    fragt.value = false
  }
  // Erst nach der Anfrage abspielen: Solange fragt gilt, ruft das Polling nicht ab
  if (computerZug.length && vorher) await einreihen(vorher, computerZug)
}

/** Anfragen des Gegners, die noch abgespielt werden, älteste zuerst */
const warteschlange: AnfrageErgebnis[] = []
let wiedergabe: Promise<void> | null = null

/**
 * Hängt Anfragen des Gegners an die Wiedergabe an. Läuft schon eine, spielt sie die neuen
 * einfach mit ab. Sonst startet eine neue ab der Karte start.
 */
function einreihen(start: BekannteKarte, liste: AnfrageErgebnis[]): Promise<void> {
  warteschlange.push(...liste)
  if (!wiedergabe) wiedergabe = abspielen(start).finally(() => (wiedergabe = null))
  return wiedergabe
}

/**
 * Spielt die Anfragen des Gegners nacheinander auf meinem Feld ab. Jede Anfrage dauert
 * WIEDERGABE_PAUSE_MS: erst ANFRAGE_ANZEIGE_MS nur die Anfrage, dann Antwort und Zug,
 * danach bleibt die Antwort ANTWORT_ANZEIGE_MS stehen.
 * Im Duell holt die Wiedergabe auf: Warten weitere Anfragen, läuft sie dreimal so schnell.
 * Sonst liefe sie dem Gegner davon, und meine Bedenkzeit verstriche schon während der Wiedergabe.
 */
async function abspielen(start: BekannteKarte) {
  let karte = start
  abspielKarte.value = karte
  // Erst meine letzte Antwort zu Ende zeigen, zum Beispiel "Nein, eine Mauer direkt davor"
  await antwortLesbar
  while (warteschlange.length) {
    const a = warteschlange.shift()!
    const tempo = istDuell.value && warteschlange.length > 0 ? 3 : 1
    anzeige.value = { wer: gegnerName.value, ziel: a.ziel, antwort: null, feld: 'eigen' }
    await warten(ANFRAGE_ANZEIGE_MS / tempo)
    karte = spurFortschreiben(karte, a)
    abspielKarte.value = karte
    anzeige.value = { ...anzeige.value, antwort: a }
    antwortNr.value++
    await warten(ANTWORT_ANZEIGE_MS / tempo)
  }
  // Am Ende gilt wieder der Stand des Servers
  abspielKarte.value = null
}

/** Duell: Das Polling bringt neue Anfragen des Gegners. Die spielt die Box nach. */
function gegnerNachspielen(alt: Match, neu: Match) {
  const bisher = alt.gegnerAnfragen?.length ?? 0
  const neue = (neu.gegnerAnfragen ?? []).slice(bisher)
  if (neue.length && alt.gegnerKarte) einreihen(alt.gegnerKarte, neue)
}

/** Das Ergebnis erscheint erst, wenn die letzte Anfrage zu Ende abgespielt ist */
const ergebnisZeigen = computed(() => vorbei.value && !abspielKarte.value)
const anfrageText = computed(() =>
  anzeige.value ? `${anzeige.value.wer} ${anzeige.value.wer === 'Du' ? 'fragst' : 'fragt'}` : '',
)

/** Nach dem Spiel zurück: im Turnier zur Übersicht, sonst zum Dashboard */
const rueckweg = computed(() => {
  const turnierId = match.value?.competitionId
  return turnierId
    ? { ziel: `/turnier/${turnierId}`, text: 'Zur Turnierübersicht' }
    : { ziel: '/dashboard', text: 'Zum Dashboard' }
})

async function aufgebenKlicken() {
  try {
    uebernehmen(await aufgeben(props.id))
    await router.push(rueckweg.value.ziel)
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
        <!-- In startbereit zeigt das Overlay die Frist -->
        <p
          v-if="frist && restSek !== null && match.status !== 'startbereit'"
          data-test="countdown"
          class="font-titel text-3xl tabular-nums"
          :class="restSek <= frist.rotAb ? 'text-red-600' : ''"
          :title="frist.titel"
        >
          {{ zeitText(restSek) }}
        </p>
        <h1 data-test="titel" class="font-titel text-2xl">{{ titel }}</h1>
        <p data-test="status" class="text-slate-600">
          {{ STATUS_TEXT[match.status] }}
          <template v-if="match.competitionId"> · Turnier</template>
          <template v-if="match.schwierigkeit">
            · {{ SCHWIERIGKEITEN.find((s) => s.wert === match!.schwierigkeit)?.text }}
          </template>
        </p>
      </div>

      <!-- Bereitschaft (ADR-008): Overlay über der ganzen Seite -->
      <div
        v-if="match.status === 'startbereit'"
        data-test="bereitschaft"
        class="fixed inset-0 z-10 flex animate-einblenden items-center justify-center bg-slate-900/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bereitschaft-titel"
      >
        <div
          class="w-full max-w-sm animate-hineinzoomen space-y-4 rounded-lg bg-white p-6 text-center shadow-lg"
        >
          <p id="bereitschaft-titel" class="font-titel text-2xl">Bist du bereit zu spielen?</p>
          <p
            v-if="restSek !== null"
            data-test="bereit-countdown"
            class="font-titel text-4xl tabular-nums"
            :class="restSek <= 10 ? 'text-red-600' : ''"
          >
            {{ zeitText(restSek) }}
          </p>
          <button
            v-if="!match.ich.startBestaetigt"
            type="button"
            data-test="starten"
            class="w-full rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
            :disabled="startet"
            @click="starten"
          >
            {{ startet ? 'Bitte warten ...' : 'Spiel starten' }}
          </button>
          <p v-else data-test="warte-gegner" class="text-slate-600">Warte auf den Gegner ...</p>
          <p v-if="startFehler" data-test="start-fehler" role="alert" class="text-sm text-red-600">
            {{ startFehler }}
          </p>
        </div>
      </div>

      <!-- Abgebrochen: keiner war bereit, das Spiel zählt nicht -->
      <div
        v-if="match.status === 'abgebrochen'"
        data-test="ergebnis"
        class="animate-hineinzoomen rounded-lg bg-slate-200 p-4 text-center text-slate-800"
      >
        <p class="font-titel text-2xl">Abgebrochen</p>
        <!-- Nur ein Spieler: Im Warteraum ist niemand beigetreten oder der Ersteller hat abgebrochen -->
        <p v-if="match.spieler.length === 1" class="text-sm">
          Niemand ist beigetreten. Das Spiel zählt nicht.
        </p>
        <p v-else class="text-sm">Keiner war rechtzeitig bereit. Das Spiel zählt nicht.</p>
        <RouterLink :to="rueckweg.ziel" data-test="rueckweg" class="mt-2 inline-block underline">
          {{ rueckweg.text }}
        </RouterLink>
      </div>

      <!-- Spielende -->
      <div
        v-else-if="ergebnisZeigen"
        data-test="ergebnis"
        class="animate-hineinzoomen rounded-lg p-4 text-center"
        :class="
          match.siegerId === meineId ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
        "
      >
        <p class="font-titel text-2xl">
          {{ match.siegerId === meineId ? 'Gewonnen!' : 'Verloren' }}
        </p>
        <p v-if="match.endegrund" class="text-sm">{{ ENDEGRUND_TEXT[match.endegrund] }}</p>
        <p data-test="anfragen" class="text-sm">
          Anfragen:
          <template v-for="(s, i) in match.spieler" :key="s.id">
            {{ i > 0 ? ' · ' : '' }}{{ s.id === meineId ? 'Du' : s.name }} {{ s.anfragen }}
          </template>
        </p>
        <RouterLink :to="rueckweg.ziel" data-test="rueckweg" class="mt-2 inline-block underline">
          {{ rueckweg.text }}
        </RouterLink>
      </div>

      <!-- Warteraum (ADR-009): Code weitergeben, bis der Gegner beitritt -->
      <div
        v-else-if="match.status === 'wartet'"
        data-test="warteraum"
        class="mx-auto w-full max-w-sm animate-hineinzoomen space-y-4 rounded-lg bg-white p-6 text-center shadow-lg"
      >
        <p class="font-titel text-xl">Warte auf deinen Gegner</p>
        <p class="text-sm text-slate-600">Gib ihm diesen Spielcode:</p>
        <p data-test="code" class="font-titel text-5xl tracking-widest select-all">
          {{ match.code }}
        </p>
        <p class="text-sm text-slate-600">
          Er wählt "Live-Gegner", dann "Spiel beitreten" und gibt den Code ein. Sobald er beitritt,
          beginnt für euch beide der Aufbau.
        </p>
        <p
          v-if="restSek !== null"
          data-test="code-countdown"
          class="text-sm tabular-nums"
          :class="restSek <= 60 ? 'text-red-600' : 'text-slate-600'"
        >
          Der Code gilt noch {{ zeitText(restSek) }}.
        </p>
      </div>

      <!-- Anfragebox (ADR-037): erst die Anfrage, dann die Antwort, dann der Zug auf dem Feld -->
      <div
        v-else-if="match.status === 'laeuft' || abspielKarte"
        data-test="anfragebox"
        class="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg bg-white p-4 text-center shadow-lg"
        aria-live="polite"
      >
        <p data-test="zug" class="text-sm text-slate-600">{{ zugText }}</p>
        <template v-if="anzeige">
          <p data-test="anfrage" class="font-titel text-2xl">
            {{ anfrageText }} <span class="text-3xl">{{ anzeige.ziel }}?</span>
          </p>
          <p
            v-if="anzeige.antwort"
            :key="`antwort-${antwortNr}`"
            data-test="antwort"
            class="animate-hineinzoomen rounded-full px-4 py-1 font-titel text-xl"
            :class="ANTWORT_FARBE[anzeige.antwort.ergebnis]"
          >
            {{ antwortText(anzeige.antwort) }}
          </p>
          <p v-else data-test="antwort-offen" class="text-slate-400 motion-safe:animate-pulse">
            Antwort kommt ...
          </p>
        </template>
        <p v-else-if="auslosung" data-test="auslosung" class="font-titel text-xl">
          {{ auslosung }}
        </p>
      </div>

      <!-- Live-Kasten im Duell: Optik wie das Bereitschafts-Overlay, aber ohne Abdunkeln -->
      <div
        v-if="istDuell && (match.status === 'laeuft' || match.status === 'beendet')"
        data-test="live-kasten"
        class="space-y-2 rounded-lg bg-white p-4 shadow-lg"
        aria-live="polite"
      >
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="font-titel text-lg">Live: {{ gegnerName }} sucht deinen Schatz</h2>
          <span class="text-sm text-slate-600">{{ gegnerZuege.length }} Anfragen</span>
        </div>
        <ol
          v-if="gegnerZuege.length"
          data-test="live-liste"
          class="max-h-40 space-y-1 overflow-y-auto text-sm"
        >
          <li
            v-for="(a, i) in gegnerZuege"
            :key="gegnerZuege.length - i"
            :class="i === 0 ? 'font-semibold' : 'text-slate-600'"
          >
            {{ a.ziel }}? → {{ antwortText(a) }}
          </li>
        </ol>
        <p v-else class="text-sm text-slate-600">Noch keine Anfragen.</p>
      </div>

      <div v-if="match.status !== 'wartet'" class="grid gap-6 md:grid-cols-2">
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
            :anfrage-ziel="anzeige?.feld === 'eigen' && !anzeige.antwort ? anzeige.ziel : null"
            :bearbeitbar="imAufbau"
            @mauer="mauerKlick"
            @zelle="zelleKlick"
          />
          <template v-if="imAufbau">
            <p
              v-if="match.ich.nachbesserungEndeAm"
              data-test="nachbesserung"
              role="alert"
              class="rounded bg-orange-100 px-3 py-2 text-sm text-orange-900"
            >
              Die Aufbauzeit ist vorbei, dein Schatz ist aber nicht erreichbar. Du hast eine Minute
              zum Nachbessern. Danach öffnet der Server zufällig rot markierte Mauern.
            </p>
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
            <template v-if="match.gegner?.nachbesserungEndeAm">
              Der Gegner überarbeitet seinen Irrgarten.
            </template>
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
            :anfrage-ziel="anzeige?.feld === 'gegner' && !anzeige.antwort ? anzeige.ziel : null"
            @zelle="anfragen"
          />
        </div>
      </div>

      <button
        v-if="!vorbei"
        type="button"
        data-test="aufgeben"
        class="rounded bg-slate-200 px-3 py-2"
        @click="aufgebenKlicken"
      >
        {{ match.status === 'wartet' ? 'Abbrechen' : 'Aufgeben' }}
      </button>
    </template>

    <p v-else class="text-slate-600">Lade ...</p>
  </section>
</template>
