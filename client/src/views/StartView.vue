<!--
  STARTVIEW (Route /, einzige öffentliche Seite): Anmelden und Registrieren in einem Formular
  Ablauf beim Absenden:
  1. Eingaben im Browser prüfen (schnelle Rückmeldung, spart Requests)
  2. anmelden() oder registrieren() aus anmeldung.ts aufrufen
  3. Erfolg: weiter ins Dashboard. Fehler: Feldfehler am Feld oder Meldung über dem Button
  Der Server prüft trotzdem selbst. Die Browser-Prüfung ist nur Komfort, keine Sicherheit.
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// Längen kommen aus shared/: Client und Server prüfen mit denselben Grenzen
import { NAME_LAENGE, PASSWORT_LAENGE } from '@shared/types.ts'
import { ApiFehler } from '@/api'
import { anmelden, registrieren } from '@/anmeldung'

type Modus = 'anmelden' | 'registrieren'

const router = useRouter()

// Formularzustand: je Eingabefeld ein ref, per v-model im Template verbunden
const modus = ref<Modus>('anmelden')
const name = ref('')
const passwort = ref('')
const passwortWiederholt = ref('')

/** Fehler je Feld, zB. Name braucht 3-20 Zeichen. Schlüssel = Feldname, z. B. { name: '...' } */
const feldFehler = ref<Record<string, string>>({})

/** Meldung über dem Button für alles ohne Feld: 401, 409, Netzwerk */
const meldung = ref<string | null>(null)
const sendet = ref(false) // sperrt den Button während des Requests (kein Doppelklick)

/** Umschalten Anmelden/Registrieren. Alte Fehler passen nicht mehr und verschwinden. */
function modusWechseln(neu: Modus) {
  modus.value = neu
  feldFehler.value = {}
  meldung.value = null
}

/** Prüft im Browser. Liefert true, wenn alles passt. */
function eingabenPruefen(): boolean {
  const fehler: Record<string, string> = {}
  const n = name.value.trim().length // trim: Leerzeichen am Rand zählen nicht (wie im Server)
  if (n < NAME_LAENGE.min || n > NAME_LAENGE.max) {
    fehler.name = `Der Name braucht ${NAME_LAENGE.min} bis ${NAME_LAENGE.max} Zeichen.`
  }
  const p = passwort.value.length
  if (p < PASSWORT_LAENGE.min || p > PASSWORT_LAENGE.max) {
    fehler.passwort = `Das Passwort braucht ${PASSWORT_LAENGE.min} bis ${PASSWORT_LAENGE.max} Zeichen.`
  }
  if (modus.value === 'registrieren' && passwort.value !== passwortWiederholt.value) {
    fehler.passwortWiederholt = 'Die Passwörter stimmen nicht überein.'
  }
  feldFehler.value = fehler
  return Object.keys(fehler).length === 0 // keine Schlüssel = keine Fehler
}

async function absenden() {
  meldung.value = null
  if (!eingabenPruefen()) return // Fehler im Browser: gar nicht erst senden

  sendet.value = true
  try {
    // Funktion als Wert: Beide haben dieselbe Signatur, also reicht ein Aufruf darunter
    const aktion = modus.value === 'anmelden' ? anmelden : registrieren
    await aktion(name.value, passwort.value)
    await router.push('/dashboard')
  } catch (e) {
    if (e instanceof ApiFehler && e.fehler?.details) {
      // Feldfehler vom Server an dieselbe Stelle wie die eigenen
      // details ist eine Liste [{ feld: 'name', problem: '...' }], hier wird daraus { name: '...' }
      const fehler: Record<string, string> = {}
      for (const { feld, problem } of e.fehler.details) fehler[feld] = problem
      feldFehler.value = fehler
    } else {
      // Fehler ohne Feldbezug: 401 falsche Zugangsdaten, 409 Name vergeben, Netzwerk
      meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
    }
  } finally {
    // finally läuft immer, bei Erfolg und bei Fehler: Button wieder freigeben
    sendet.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-sm rounded-lg bg-white p-6 shadow">
    <h1 class="font-titel text-2xl">Willkommen im Irrgarten</h1>

    <!-- Umschalter -->
    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        data-test="modus-anmelden"
        class="rounded px-3 py-2"
        :class="modus === 'anmelden' ? 'bg-blue-700 text-white' : 'bg-slate-200'"
        @click="modusWechseln('anmelden')"
      >
        Anmelden
      </button>
      <button
        type="button"
        data-test="modus-registrieren"
        class="rounded px-3 py-2"
        :class="modus === 'registrieren' ? 'bg-blue-700 text-white' : 'bg-slate-200'"
        @click="modusWechseln('registrieren')"
      >
        Registrieren
      </button>
    </div>

    <!-- @submit.prevent: verhindert das Neuladen der Seite beim Absenden (preventDefault) -->
    <!-- Enter im Feld sendet das Formular ebenfalls ab -->
    <form class="mt-4 space-y-4" @submit.prevent="absenden">
      <label class="block">
        <span class="text-sm">Name</span>
        <!-- v-model: Zwei-Wege-Bindung, Eingabe und ref name sind immer gleich -->
        <!-- autocomplete: Passwortmanager erkennen die Felder -->
        <input
          v-model="name"
          data-test="name"
          autocomplete="username"
          class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
        <span v-if="feldFehler.name" class="text-sm text-red-600">{{ feldFehler.name }}</span>
      </label>

      <label class="block">
        <span class="text-sm">Passwort</span>
        <input
          v-model="passwort"
          data-test="passwort"
          type="password"
          :autocomplete="modus === 'anmelden' ? 'current-password' : 'new-password'"
          class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
        <span v-if="feldFehler.passwort" class="text-sm text-red-600">
          {{ feldFehler.passwort }}
        </span>
      </label>

      <!-- Nur beim Registrieren: zweites Passwortfeld gegen Tippfehler -->
      <label v-if="modus === 'registrieren'" class="block">
        <span class="text-sm">Passwort wiederholen</span>
        <input
          v-model="passwortWiederholt"
          data-test="passwortWiederholt"
          type="password"
          autocomplete="new-password"
          class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
        <span v-if="feldFehler.passwortWiederholt" class="text-sm text-red-600">
          {{ feldFehler.passwortWiederholt }}
        </span>
      </label>

      <p v-if="meldung" data-test="meldung" role="alert" class="text-sm text-red-600">
        {{ meldung }}
      </p>

      <button
        type="submit"
        data-test="absenden"
        class="w-full rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
        :disabled="sendet"
      >
        <template v-if="sendet">Bitte warten ...</template>
        <template v-else>{{ modus === 'anmelden' ? 'Anmelden' : 'Registrieren' }}</template>
      </button>
    </form>
  </section>
</template>
