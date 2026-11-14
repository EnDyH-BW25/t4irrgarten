<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ApiFehler } from '@/api'
import { abmelden, nutzer } from '@/anmeldung'

const router = useRouter()
const abmeldeFehler = ref<string | null>(null)

async function abmeldenKlicken() {
  abmeldeFehler.value = null
  try {
    await abmelden()
    await router.push('/')
  } catch (e) {
    abmeldeFehler.value = e instanceof ApiFehler ? e.message : 'Abmelden fehlgeschlagen.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 font-text text-slate-900">
    <header class="bg-blue-700 text-white">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="font-titel text-xl">Irrgarten</RouterLink>
        <!-- Nur angemeldet: Dashboard, Name und Abmelden -->
        <div v-if="nutzer" class="flex items-center gap-4">
          <RouterLink to="/dashboard" class="hover:underline">Dashboard</RouterLink>
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
      <p v-if="abmeldeFehler" role="alert" class="bg-red-600 px-4 py-2 text-center text-sm">
        {{ abmeldeFehler }}
      </p>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
