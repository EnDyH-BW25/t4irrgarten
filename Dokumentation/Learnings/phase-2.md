# Learnings Phase 2 - Authentifizierung

Phase 2 bringt Registrierung, Login und Logout. Sie umfasst sechs Schritte, vier im Server und zwei im Client.

1. Passwort-Hash
2. Nutzer-Speicher in einer JSON-Datei
3. Sessions und Middleware
4. Auth-Routen
5. Client: Anmeldezustand, Startbildschirm und Kopfzeile
6. Client: Router-Guard

Die Server-Dateien liegen in `server/auth/`. Am Ende der Phase laufen 93 Tests im Server und 35 im Client. Die Entscheidungen stehen in ADR-022 bis ADR-024.

## Grundprinzip: Der Server entscheidet, der Client hilft

- Der Server prüft jede Eingabe und jede Session. Er vertraut dem Client nie.
- Der Client prüft dieselben Grenzen vorab. Das spart Umwege, ersetzt aber keine Prüfung im Server.
- Der Router-Guard im Client ist Komfort. Die Sicherheit liegt beim Server, der ohne Session mit 401 antwortet.

Wie in Phase 1 werfen reine Funktionen keine Fehler. `passwortPruefen` liefert `false`, `zugangsdatenPruefen` ein Ergebnisobjekt. Erst die Route wirft den `ApiFehler`.

## 1. Passwort-Hash

Datei `server/auth/passwort.ts`

### Learnings

- Ein Hash ist eine Einwegfunktion. Aus dem Hash lässt sich das Passwort nicht zurückrechnen. Beim Login hasht der Server die Eingabe erneut und vergleicht.
- Das Salt muss nicht geheim sein, nur für jeden Nutzer anders. Es macht vorberechnete Tabellen nutzlos. Zwei Nutzer mit demselben Passwort haben verschiedene Hashes.
- SHA-256 allein ist zu schnell. PBKDF2 wiederholt ihn 600.000-mal. Ein Login dauert dadurch etwa 130 ms, ein Angreifer schafft nur wenige Versuche pro Sekunde.
- Ein Vergleich, der beim ersten Unterschied abbricht, verrät über die Laufzeit, wie viele Bytes stimmen (Timing-Angriff). Das Ergebnis ist gleich, nur die Laufzeit verrät etwas.
- Die Iterationen stehen im gespeicherten Text. Ein höherer Wert gilt später für neue Hashes, alte bleiben prüfbar.
- Die neue TypeScript-Version in Deno verlangt `Uint8Array<ArrayBuffer>` für Web Crypto.

### Code

```ts
export async function passwortHashen(passwort: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await ableiten(passwort, salt, ITERATIONEN)
  return `${ITERATIONEN}:${zuHex(salt)}:${zuHex(hash)}`
}

/** Vergleicht in konstanter Zeit, damit die Laufzeit nichts über den Hash verrät */
function gleich(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let unterschied = 0
  for (let i = 0; i < a.length; i++) unterschied |= a[i] ^ b[i]
  return unterschied === 0
}
```

## 2. Nutzer-Speicher

Datei `server/auth/nutzerSpeicher.ts`, Typ `Nutzer` in `shared/types.ts`

### Learnings

- `Nutzer` mit Id und Name steht in `shared/`. `GespeicherterNutzer` mit Hash steht nur im Server. Was der Client nicht kennt, kann er nicht versehentlich erwarten.
- Ein Speicher hat Zustand: Pfad und Liste. Eine Klasse hält beides zusammen. Die Spiellogik ohne Zustand blieb bei reinen Funktionen.
- Ein Konstruktor darf nicht `async` sein. Die statische Methode `laden` liest zuerst und erzeugt dann das Objekt. `private constructor` verhindert ein Objekt ohne Daten.
- Zwei gleichzeitige Schreibvorgänge mischen den Inhalt. Eine Promise-Kette reiht sie hintereinander.
- `writeTextFile` leert die Datei und schreibt dann Stück für Stück. Ein Absturz dazwischen hinterlässt ungültiges JSON. Erst in eine `.tmp`-Datei schreiben und dann umbenennen: Die Datei ist immer alt oder neu, nie halb.
- Eine kaputte Datei beim Start wirft einen Fehler. Eine leere Liste würde beim nächsten Speichern alle Nutzer überschreiben.
- Deno erlaubt standardmäßig keinen Dateizugriff. `deno task test` setzt die Rechte, `deno test` allein reicht nicht mehr.

### Code

```ts
private speichern(): Promise<void> {
  this.schreibvorgang = this.schreibvorgang
    .catch(() => {}) // ein früherer Fehler soll spätere Schreibvorgänge nicht blockieren
    .then(async () => {
      const tmp = `${this.pfad}.tmp`
      await Deno.writeTextFile(tmp, JSON.stringify(this.nutzer, null, 2))
      await Deno.rename(tmp, this.pfad)
    })
  return this.schreibvorgang
}
```

## 3. Sessions und Middleware

Dateien `server/auth/sessions.ts` und `server/auth/anmeldung.ts`

### Learnings

- HTTP hat kein Gedächtnis. Die Session-Id im Cookie funktioniert wie eine Garderobenmarke. Das Passwort reist nur einmal beim Login, danach nur noch die Marke.
- Die Marke muss unerratbar sein. `crypto.randomUUID()` liefert 122 Bit Zufall.
- Middleware läuft vor dem Handler. `await next()` reicht die Anfrage weiter. Wirft die Middleware, springt Hono direkt zu `app.onError`, und der Handler läuft nie.
- `anmeldungPruefen(sessions, speicher)` bekommt ihre Abhängigkeiten als Parameter (Dependency Injection). Tests geben eigene, leere Objekte hinein.
- `c.set('nutzer', ...)` legt nur Id und Name ab. Kein Handler kann den Hash versehentlich zurückschicken.
- Ein Typ `AuthUmgebung` mit `Variables` lässt TypeScript Tippfehler bei `c.get(...)` erkennen.

### Code

```ts
return createMiddleware<AuthUmgebung>(async (c, next) => {
  const sid = getCookie(c, COOKIE_NAME)
  const nutzerId = sid ? sessions.nutzerId(sid) : null
  const gespeichert = nutzerId ? speicher.nachId(nutzerId) : null
  if (!sid || !gespeichert) {
    throw new ApiFehler(401, 'NICHT_ANGEMELDET', 'Bitte melde dich an.')
  }
  c.set('nutzer', { id: gespeichert.id, name: gespeichert.name })
  c.set('sid', sid)
  await next()
})
```

## 4. Auth-Routen

Dateien `server/auth/zugangsdaten.ts`, `server/auth/routen.ts` und `server/main.ts`

### Learnings

- Der Body von außen hat den Typ `unknown`. Erst die Prüfung macht daraus `Zugangsdaten`. Auch ein Array ist für JavaScript ein `object`, `Array.isArray` schließt es aus.
- Kaputtes JSON ist ein Fehler des Absenders. `c.req.json().catch(() => null)` macht daraus 400 statt 500.
- `HttpOnly` hält die Session-Id von Skripten fern. `SameSite=Lax` schützt gegen CSRF. `Path=/api` schickt das Cookie nur an die API.
- Erst den Namen prüfen, dann hashen. Ein vergebener Name kostet so keine 130 ms. `anlegen` prüft danach ein zweites Mal, weil während des Hashens eine andere Registrierung dazwischenkommen kann.
- Unbekannter Name und falsches Passwort laufen in dasselbe `if` und bekommen dieselbe Meldung.
- `appErstellen(sessions, speicher)` ersetzt die feste `app`. Nur `import.meta.main` lädt die echte Datei, Tests berühren sie nie.
- `--allow-write=data` erlaubt dem Server das Schreiben nur im Ordner `data`.

### Code

```ts
routen.post('/login', async (c) => {
  const { name, passwort } = await zugangsdatenLesen(c)
  const gespeichert = speicher.nachName(name)
  if (!gespeichert || !(await passwortPruefen(passwort, gespeichert.passwortHash))) {
    throw new ApiFehler(401, 'NICHT_ANGEMELDET', 'Name oder Passwort falsch.')
  }
  return c.json(sessionStarten(c, gespeichert))
})
```

## 5. Client: Anmeldezustand, Startbildschirm und Kopfzeile

Dateien `client/src/anmeldung.ts`, `client/src/views/StartView.vue` und `client/src/App.vue`

### Learnings

- Ein `ref` auf Modulebene existiert genau einmal. Formular, Kopfzeile und Router sehen denselben Wert. Meldet das Formular an, wechselt die Kopfzeile von selbst.
- Im Script heißt es `nutzer.value`, im Template reicht `nutzer`.
- Einen `ApiFehler` nicht in `new Error(...)` verpacken. Dabei gehen `code`, `status` und `details` verloren, und das Formular weiß nicht mehr, welches Feld betroffen ist.
- Nur wer den Fehler anzeigt, fängt ihn. `anmelden` hat deshalb kein `try/catch`, das Formular schon.
- `pruefen` ist die Ausnahme. Eine 401 bei `/auth/me` heißt "niemand angemeldet" und ist kein Fehler.
- `abmelden` wertet 401 als Erfolg. Die Session war schon weg, das Ziel ist erreicht.
- `@/` ist der Alias für `src/`. `'@api'` sucht dagegen ein npm-Paket.
- Ein falscher Pfad wie `'/anmeldung'` ist für TypeScript nur Text und erscheint nicht rot. Ob es ihn gibt, zeigt erst ein Test.
- Ein Syntaxfehler wie ein fehlendes Komma färbt die ganze Datei rot. Die erste Meldung von `npm run type-check` zeigt die Ursache.
- `@submit.prevent` verhindert das Neuladen der Seite. `:disabled="sendet"` verhindert doppeltes Absenden. `finally` gibt den Button in jedem Fall wieder frei.
- `autocomplete` mit `current-password` und `new-password` hilft Passwort-Managern.

### Code

```ts
async function absenden() {
  meldung.value = null
  if (!eingabenPruefen()) return

  sendet.value = true
  try {
    const aktion = modus.value === 'anmelden' ? anmelden : registrieren
    await aktion(name.value, passwort.value)
    await router.push('/dashboard')
  } catch (e) {
    if (e instanceof ApiFehler && e.fehler?.details) {
      const fehler: Record<string, string> = {}
      for (const { feld, problem } of e.fehler.details) fehler[feld] = problem
      feldFehler.value = fehler
    } else {
      meldung.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler.'
    }
  } finally {
    sendet.value = false
  }
}
```

## 6. Client: Router-Guard

Datei `client/src/router/index.ts`

### Learnings

- `router.beforeEach` läuft vor jedem Seitenwechsel. Ein zurückgegebener Pfad leitet um, kein Rückgabewert lässt durch.
- Nach dem Neuladen ist der Speicher des Clients leer, das Cookie gilt aber weiter. Der Guard fragt deshalb einmal `/auth/me`.
- `geprueft` wird nur bei einer echten Antwort `true`. Ohne Antwort weiß der Client nichts und fragt beim nächsten Wechsel erneut.
- Geschützt als Standard: Eine vergessene Angabe macht eine Seite zu streng, nicht unbemerkt offen.
- `declare module 'vue-router'` erweitert den Typ `RouteMeta` um `oeffentlich`. TypeScript erkennt dann Tippfehler.
- Eine Umleitung ist selbst ein Seitenwechsel und durchläuft den Guard erneut.
- `routerErstellen(history)` folgt demselben Muster wie `appErstellen` im Server. Jeder Test bekommt einen frischen Router mit eigenem Merker.

### Code

```ts
router.beforeEach(async (ziel) => {
  if (!geprueft) {
    try {
      await pruefen()
      geprueft = true
    } catch {
      // Server nicht erreichbar => als abgemeldet behandeln, beim nächsten Wechsel erneut fragen
    }
  }
  if (!ziel.meta.oeffentlich && !nutzer.value) return '/'
  if (ziel.name === 'start' && nutzer.value) return '/dashboard'
})
```

## 7. Testen

- Tests mit Dateien bekommen über `mitTempOrdner` einen eigenen leeren Ordner. `finally` räumt ihn auch nach einem Fehlschlag auf.
- `app.request()` testet Routen ohne Netzwerk. Den Cookie-Header setzt der Test von Hand, die Session-Id liest er aus `Set-Cookie`.
- Grenzen auf beiden Seiten testen: 3 und 20 Zeichen sind erlaubt, 2 und 21 nicht. Bei Grenzen passieren die meisten Fehler.
- Ein Zustand auf Modulebene überlebt von Test zu Test. `beforeEach` setzt `nutzer.value = null`.
- `vi.fn<typeof fetch>(...)` gibt der Attrappe die Parameter von `fetch`. `mock.calls` ist dann typisiert.
- `serverAttrappe` antwortet je nach URL. Eine unerwartete Anfrage lässt den Test scheitern.
- `data-test`-Attribute machen Komponententests unabhängig von Texten und CSS-Klassen.
- Ein scheiternder Test zeigt nicht immer einen Fehler im Code. Die dritte Anfrage im Guard-Test war richtiges Verhalten, die Erwartung war falsch.

## 8. Werkzeuge und Arbeitsweise

- `deno task test` im Server, `npm run type-check` und `npx vitest run` im Client.
- Ein echter Probelauf mit `curl` über Port 5173 prüft den Weg über den Vite-Proxy.
- Eine Umstrukturierung ohne neue Funktion bekommt einen eigenen Commit (`refactor`).
- Tests, die zu zwei Commits gehören, kommen in getrennte Dateien. Sonst lassen sich die Commits nicht sauber trennen.
- `git commit --amend` korrigiert einen Tippfehler in der Nachricht, solange der Commit nicht gepusht ist.

## Kontrollfragen

1. Warum darf das Salt im Klartext neben dem Hash stehen?
2. Was passiert ohne den Umweg über `nutzer.json.tmp`, wenn der Server mitten im Schreiben abstürzt?
3. Warum legt `anmeldungPruefen` nur Id und Name in `c.var.nutzer` ab?
4. Warum führt kaputtes JSON im Body zu 400 und nicht zu 500?
5. Warum hat `anmelden` im Client kein `try/catch`, `pruefen` aber schon?
6. Warum setzt der Guard `geprueft` bei einem Netzwerkfehler nicht auf `true`?
