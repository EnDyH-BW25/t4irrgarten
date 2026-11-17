<!--
  WURZELKOMPONENTE: Rahmen jeder Seite
  Oben die Kopfzeile (Logo, bei Anmeldung Dashboard-Link, Name, Abmelden),
  darunter <RouterView />: Dort zeigt der Router die View zur aktuellen URL.
  Aufbau einer Vue-Datei (Single File Component): <script> = Logik, <template> = HTML.
-->
<script setup lang="ts">
// "script setup": Alles, was hier oben steht, ist im Template direkt nutzbar
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ApiFehler } from '@/api'
import { abmelden, nutzer } from '@/anmeldung' // nutzer = gemeinsamer, reaktiver Anmeldezustand

const router = useRouter()
const abmeldeFehler = ref<string | null>(null) // Text für die rote Fehlerzeile, null = keine

async function abmeldenKlicken() {
  abmeldeFehler.value = null
  try {
    await abmelden()
    await router.push('/') // nach dem Abmelden zur Startseite
  } catch (e) {
    // z. B. Server nicht erreichbar: Meldung anzeigen, Nutzer bleibt angemeldet
    abmeldeFehler.value = e instanceof ApiFehler ? e.message : 'Abmelden fehlgeschlagen.'
  }
}
</script>

<template>
  <!-- Klassen wie bg-slate-100 sind Tailwind: jede Klasse = eine CSS-Eigenschaft -->
  <div class="min-h-screen bg-slate-100 font-text text-slate-900">
    <header class="bg-blue-700 text-white">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <!-- RouterLink wechselt die Seite ohne Neuladen (Single Page Application) -->
        <RouterLink to="/" class="font-titel text-xl">Irrgarten</RouterLink>
        <!-- Nur angemeldet: Dashboard, Name und Abmelden -->
        <!-- Im Template entpackt Vue ref-Werte automatisch: nutzer statt nutzer.value -->
        <div v-if="nutzer" class="flex items-center gap-4">
          <RouterLink to="/dashboard" class="hover:underline">Dashboard</RouterLink>
          <!-- data-test: fester Anker für die Tests, unabhängig von Text und CSS -->
          <span data-test="nutzername">{{ nutzer.name }}</span>
          <button
            type="button"
            data-test="abmelden"
            class="rounded bg-white/15 px-3 py-1 hover:bg-white/25"
            @click="abmeldenKlicken"
          >
            Abmelden
          </button>
        </div>
      </nav>
      <!-- role="alert": Screenreader lesen die Meldung sofort vor -->
      <p v-if="abmeldeFehler" role="alert" class="bg-red-600 px-4 py-2 text-center text-sm">
        {{ abmeldeFehler }}
      </p>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-6">
      <!-- Platzhalter: Hier erscheint StartView, DashboardView, SpielView usw. -->
      <RouterView />
    </main>
  </div>
</template>
