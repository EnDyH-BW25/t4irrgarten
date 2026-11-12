# Learnings Phase 0 - Fundament

Phase 0 legt die Basis für alle weiteren Phasen. Sie umfasst drei Punkte.

1. Gemeinsame Typen für Zelle, Mauer, Labyrinth und Match-Status
2. Fehlerformat und Hono-Middleware für Logging und JSON-Fehler
3. Client-Grundgerüst mit Layout, Router und API-Hilfsmodul

## 1. Gemeinsame Typen

Datei `shared/types.ts`

### Learnings

- Server und Client nutzen dieselbe Typdatei. Beide Seiten bleiben dadurch synchron.
- Template Literal Types (Typen aus Textmustern) prüfen beim Kompilieren, ob ein String eine gültige Zelle ist. TypeScript lehnt `'G7'` ab.
- Das Projekt nutzt nur `type` und kein `interface`. Die Schreibweise bleibt einheitlich.
- `MatchStatus` und `FehlerCode` übernehmen die Werte aus `openapi.yaml`. Die API-Beschreibung bleibt die Quelle der Wahrheit.
- Der Server importiert `../shared/types.ts`. Der Client importiert `@shared/types.ts` mit `import type`.

### Code

```ts
export type Zeile = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type Spalte = 1 | 2 | 3 | 4 | 5 | 6
export type Zelle = `${Zeile}${Spalte}` // 'A1' bis 'F6'
export type Mauer = `${Zelle}_${Zelle}` // 'A1_A2'

export type LabyrinthEntwurf = {
  schatz: Zelle | null // im Aufbau darf der Schatz fehlen
  mauern: Mauer[]
}

export type MatchStatus = 'wartet' | 'aufbau' | 'startbereit' | 'laeuft' | 'beendet' | 'abgebrochen'
```

### Grenze der Typen

Der Typ `Mauer` prüft keine Nachbarschaft. TypeScript akzeptiert `'A1_F6'`. Diese Prüfung übernimmt Phase 1 zur Laufzeit.

## 2. Fehlerformat und Middleware im Server

Dateien `server/fehler.ts` und `server/main.ts`

### Learnings

- Jeder Fehler hat dieselbe Form `{ fehler: { code, nachricht, details?, problematischeMauern? } }`. Der Client verlässt sich darauf.
- Handler werfen einen `ApiFehler` mit `throw`. Sie bauen die Fehlerantwort nicht selbst.
- `app.onError` fängt alle Fehler zentral ab. Unbekannte Fehler ergeben Status 500 mit Code `INTERN`. Die Antwort verrät keine Interna, die Details landen nur im Log.
- `app.notFound` liefert für unbekannte Routen ebenfalls das JSON-Format.
- `import.meta.main` startet den Server nur bei direktem Aufruf. Tests importieren `app`, ohne einen Port zu öffnen.

### Code

```ts
export class ApiFehler extends Error {
  constructor(
    public readonly status: FehlerStatus,
    public readonly code: FehlerCode,
    nachricht: string,
    public readonly zusatz: Zusatz = {}, // details, problematischeMauern
  ) {
    super(nachricht)
    this.name = 'ApiFehler'
  }
}

export function fehlerBehandeln(err: Error, c: Context) {
  if (err instanceof ApiFehler) {
    const body: Fehler = { fehler: { code: err.code, nachricht: err.message, ...err.zusatz } }
    return c.json(body, err.status)
  }
  console.error(err) // Details nur ins Log
  const body: Fehler = { fehler: { code: 'INTERN', nachricht: 'Interner Serverfehler.' } }
  return c.json(body, 500)
}
```

```ts
export const app = new Hono().basePath('/api')

app.use(logger())
app.onError(fehlerBehandeln)
app.notFound(nichtGefunden)

if (import.meta.main) {
  Deno.serve({ port: 8000 }, app.fetch)
}
```

### Testmuster

`server/fehler_test.ts` baut eine eigene kleine `testApp` mit Testrouten. `testApp.request()` simuliert Anfragen ohne echten Server. `main.ts` braucht dadurch keine Testrouten.

```ts
const testApp = new Hono()
testApp.onError(fehlerBehandeln)

testApp.get('/fachfehler', () => {
  throw new ApiFehler(409, 'NICHT_AM_ZUG', 'Der Gegner ist am Zug.')
})

Deno.test('ApiFehler liefert Status, Code und Nachricht', async () => {
  const res = await testApp.request('/fachfehler')
  assertEquals(res.status, 409)
})
```

## 3. Client-Grundgerüst

Dateien `client/vite.config.ts`, `client/tsconfig.app.json`, `client/src/api.ts`, `client/src/router/index.ts`, `client/src/assets/main.css`

### Learnings

- Der Vite-Proxy leitet `/api` an `localhost:8000` weiter. Der Client ruft nur relative Pfade auf. CORS-Einstellungen entfallen.
- Der Alias `@shared` zeigt auf `../shared`. Er steht in `vite.config.ts` und in `tsconfig.app.json`. Fehlt er in einer Datei, kennt nur Vite oder nur TypeScript den Pfad.
- `import type` holt nur Typen. Im gebauten JavaScript bleibt davon nichts übrig.
- Das API-Modul unterscheidet zwei Fehlerarten. Fachfehler kommen vom Server mit eigenem Code. `NETZWERK` bedeutet, dass der Server nicht antwortet. Dazu zählen auch die Status 502 bis 504 vom Proxy.
- Der Client hat einen eigenen `ApiFehler`. Er erweitert die Codes um `NETZWERK`.

### Code API-Modul

```ts
async function api<T>(pfad: string, optionen: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${pfad}`, {
      headers: { 'Content-Type': 'application/json' },
      ...optionen,
    })
  } catch {
    throw new ApiFehler(0, 'NETZWERK', 'Der Server ist nicht erreichbar.')
  }

  if (res.status === 204) return undefined as T
  const daten: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const f = (daten as Fehler | null)?.fehler
    // 502-504 ohne unser Fehlerformat kommen vom Proxy
    if (!f && res.status >= 502 && res.status <= 504) {
      throw new ApiFehler(res.status, 'NETZWERK', 'Der Server ist nicht erreichbar.')
    }
    throw new ApiFehler(
      res.status,
      f?.code ?? 'INTERN',
      f?.nachricht ?? 'Unbekannter Fehler.',
      f ?? null,
    )
  }
  return daten as T
}

export const get = <T>(pfad: string) => api<T>(pfad)

export const post = <T>(pfad: string, daten?: unknown) =>
  api<T>(pfad, { method: 'POST', body: JSON.stringify(daten ?? {}) })

export const put = <T>(pfad: string, daten: unknown) =>
  api<T>(pfad, { method: 'PUT', body: JSON.stringify(daten) })
```

### Code Proxy und Alias

```ts
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
  },
},
server: {
  proxy: { '/api': 'http://localhost:8000' },
},
```

### Code Router

Das Dashboard lädt per Lazy Loading erst bei Bedarf. Eine Catch-all-Route leitet unbekannte Pfade auf die Startseite um.

```ts
routes: [
  { path: '/', name: 'start', component: StartView },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/:pfad(.*)*', redirect: '/' },
],
```

### Code Schriften

Tailwind 4 erzeugt aus `@theme` die Klassen `font-titel` und `font-text`.

```css
@theme {
  --font-titel: 'Bowlby One', sans-serif;
  --font-text: 'Rubik', sans-serif;
}
```

## 4. Werkzeuge und Arbeitsweise

- Prettier im Root und `deno fmt` nutzen dieselben Regeln. Kein Semikolon, einfache Anführungszeichen, 100 Zeichen Zeilenbreite.
- Icons kommen per Import aus `@tabler/icons-vue`. Farben und Schriften stehen in `Dokumentation/design.md`.
- Commits folgen Conventional Commits mit deutscher Beschreibung. Mehrere kleine Commits statt eines großen.
- Vor jedem Commit zeigt `git diff --staged --stat` den Umfang.
- `.vscode/` bleibt lokal und steht in der `.gitignore`.

## Kontrollfragen

1. Warum lehnt TypeScript `'G7'` als `Zelle` ab, aber `'A1_F6'` als `Mauer` nicht?
2. Was sieht der Client, wenn ein Handler versehentlich einen normalen `Error` wirft? Warum fehlt die Fehlermeldung in der Antwort?
3. Warum steht der Alias `@shared` an zwei Stellen?
4. Wann liefert das API-Modul den Code `NETZWERK`?
