<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiFehler, get } from '@/api'

type Health = { status: string; serverZeit: string }

const meldung = ref('Prüfe Verbindung ...')

onMounted(async () => {
  try {
    const health = await get<Health>('/health')
    meldung.value = `Server erreichbar, Serverzeit ${health.serverZeit}`
  } catch (e) {
    meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
  }
})
</script>

<template>
  <h1 class="font-titel text-2xl">Willkommen im Irrgarten</h1>
  <p class="mt-2 text-slate-600">{{ meldung }}</p>
</template>
