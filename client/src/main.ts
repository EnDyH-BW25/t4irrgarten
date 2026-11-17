/**
 * EINSTIEGSPUNKT DES CLIENTS
 * index.html lädt diese Datei. Sie baut die Vue-App zusammen und hängt sie in die Seite.
 * Ablauf: App erzeugen -> Router einbauen -> in <div id="app"> einhängen.
 */
import { createApp } from 'vue'
import App from './App.vue' // Wurzelkomponente: Kopfzeile + Platz für die aktuelle Seite
import router from './router' // entscheidet, welche View zu welcher URL gehört
import './assets/main.css' // Tailwind und eigene Schriften/Farben

const app = createApp(App)

// Plugin registrieren: Danach kennen alle Komponenten <RouterLink>, <RouterView> und useRouter()
app.use(router)

// '#app' ist das leere <div id="app"> in index.html. Ab hier zeichnet Vue die Oberfläche.
app.mount('#app')
