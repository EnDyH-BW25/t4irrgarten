# Learnings Phase 3 - Spiel gegen den Computer

Phase 3 bringt den ersten spielbaren Meilenstein. Ein Nutzer startet im Dashboard ein Spiel gegen den Computer, baut sein Labyrinth, setzt es und sucht danach den Schatz des Computers. Die Phase umfasst zehn Schritte.

1. Gemeinsame Typen für das Match
2. Labyrinth-Generator mit Schatzplatzierung
3. Computer-Sucher
4. Match-Schicht im Server
5. Match-Routen
6. Dashboard und offenes Match
7. Spielbrett
8. Countdown, Prüfanzeige und Irrgarten setzen
9. Spielphase mit Polling
10. Simulation der Schwierigkeit

Die Spiellogik liegt in `server/spiellogik/`, die Match-Schicht in `server/match/`, das Spielbrett in `client/src/`. Am Ende der Phase laufen 189 Tests im Server und 95 im Client. Die Entscheidungen stehen in ADR-025 bis ADR-027.

## Grundprinzip: Drei Schichten mit klaren Aufgaben

| Schicht | Ordner | Aufgabe | Fehler |
| --- | --- | --- | --- |
| Spiellogik | `server/spiellogik/` | Regeln als reine Funktionen | liefert `null` oder `false` |
| Match-Schicht | `server/match/` | Ablauf, Zugrecht, Zähler, Ansicht | wirft `ApiFehler` (ADR-026) |
| Routen | `server/match/routen.ts` | HTTP lesen und antworten | reicht Fehler an `app.onError` |

Der Server entscheidet alles (ADR-002). Der Client zeigt an und schickt Klicks.

## 1. Gemeinsame Typen

Datei `shared/types.ts`, Vertrag `Dokumentation/openapi.yaml`

### Learnings

- Feldnamen stehen im Vertrag. Raten führt zu Abweichungen, die erst später auffallen. Im Vertrag sucht man nach `Name:` für ein Schema und nach `schemas/Name` für seine Verwendung.
- Leere Felder schickt der Server als `null`, nie fehlend. Der Client prüft dann nur einen Fall.
- Ein neues Feld kommt zuerst in den Vertrag, danach in den Typ, danach in den Code (contract-first). `gegnerKarte` und später `schwierigkeit` im Nutzer liefen so.
- Ein gemeinsamer Typ zeigt jede betroffene Stelle sofort. Das neue Pflichtfeld `schwierigkeit` hat vier Client-Tests rot gemacht, bevor ein Fehler im Betrieb entstehen konnte.

## 2. Labyrinth-Generator und Schatzplatzierung

Dateien `server/spiellogik/generator.ts` und `server/spiellogik/wegbewertung.ts`

### Learnings

- Ein Spannbaum per zufälliger Tiefensuche verbindet alle 36 Zellen ohne Schleifen. Das Labyrinth ist dadurch immer lösbar.
- Braiding entfernt danach Mauern und erzeugt Schleifen. Mehr Schleifen machen das Labyrinth leichter (ADR-004).
- Die Weglänge allein sagt wenig über die Schwierigkeit. Eine Anfrage läuft eine ganze Gerade entlang. Abbiegungen und Abzweigungen zählen mehr (ADR-025, Idee aus der Diskussion im Projekt).
- Zufall kommt als Parameter in die Funktion. Tests geben `festerZufall(startwert)` hinein und bekommen bei gleichem Startwert dasselbe Labyrinth.
- Eigenschaftstests prüfen 200 Labyrinthe auf Regeln statt ein einzelnes auf feste Werte.

### Code

```ts
/** Schwerer zuerst: Wertung = Abbiegungen + Abzweigungen, die Weglänge entscheidet bei Gleichstand */
export function schwererZuerst(a: Bewertung, b: Bewertung): number {
  return wertung(b) - wertung(a) || b.laenge - a.laenge
}
```

## 3. Computer-Sucher

Dateien `server/spiellogik/karte.ts` und `server/spiellogik/sucher.ts`

### Learnings

- Der Sucher kennt nur seine Karte, nie das Labyrinth. Er bekommt dieselben Antworten wie ein Mensch.
- Regel 1 fragt in eine zufällige Richtung mit Neuland bis vor die nächste bekannte Mauer. Regel 2 läuft per Breitensuche über bekanntes Gebiet zur nächsten Zelle mit Neuland.
- Ein Test über ganze Partien hat eine Endlosschleife gefunden. Der Sucher lief in einem bekannten Gang hin und her. Erst Regel 2 hat das behoben. Einzeltests hätten diesen Fehler nicht gezeigt.
- `MAX_ANFRAGEN_PRO_ZUG` sichert gegen endlose Züge. Mit der Strategie wird die Grenze nie erreicht.

## 4. Match-Schicht

Dateien `server/match/typen.ts`, `ablauf.ts`, `ansicht.ts` und `speicher.ts`

### Learnings

- `MatchIntern` speichert nur Fakten. Abgeleitete Werte wie `pruefung` und `serverZeit` berechnet `ansichtFuer` bei jeder Antwort. Ein gespeicherter abgeleiteter Wert kann veralten.
- Typname und Feldname sind zwei Dinge. In `entwurf: LabyrinthEntwurf` ist `entwurf` der Name für den Zugriff (`ich.entwurf`) und `LabyrinthEntwurf` nur die Beschreibung.
- `ansichtFuer` schreibt jedes Feld einzeln. Ein Spread wie `...match` würde das Labyrinth des Gegners mitschicken. Der Rückgabetyp `Match` meldet jedes fehlende oder falsche Feld.
- Das Labyrinth des Gegners erscheint erst im Status `beendet`. Ein Test sucht im fertigen JSON nach dem geheimen Schatz und der geheimen Mauer.
- Die Funktionen ändern das Match direkt und erhöhen `version`. Eine `Map` hält einen Verweis auf das Objekt, keine Kopie. Der Speicher braucht deshalb keine Methode zum Aktualisieren.
- Die Prüfreihenfolge lautet Teilnahme (403), Form (400), Zustand (409), Inhalt (400 oder 422). Fremde erfahren so nichts über ein Match.
- `anfrageNr` schützt vor Doppelklick und erneutem Senden. Die zweite Anfrage mit derselben Nummer bekommt 409.

### Code

```ts
gegnerLabyrinth: match.status === 'beendet' && gegner ? gesetztesLabyrinth(gegner) : null,
```

## 5. Match-Routen

Dateien `server/match/routen.ts` und `server/main.ts`

### Learnings

- Die Routen bleiben dünn. Sie holen das Match, rufen eine Funktion aus `ablauf.ts` auf und antworten mit `ansichtFuer`. Fehler fängt `app.onError`.
- `routen.use(anmeldungPruefen(...))` schützt alle Routen der Gruppe mit einer Zeile.
- Hono prüft Routen in der Reihenfolge ihrer Definition. `/current` steht deshalb vor `/:id`.
- Polling mit `?since=<version>` beantwortet der Server mit 304 ohne Inhalt, wenn sich nichts geändert hat. Die Teilnahme prüft er vorher, sonst verriete das 304 Fremden etwas.
- `appErstellen` bekommt Uhr und Zufall als optionale Parameter mit echten Standardwerten. Tests legen beides fest.

## 6. Dashboard und offenes Match

Dateien `client/src/matches.ts`, `client/src/views/DashboardView.vue`, Endpunkt `GET /matches/current` (ADR-027)

### Learnings

- Nur der Server kennt das offene Match sicher. Ohne `/current` sperrt ein geschlossener Tab den Nutzer mit 409.
- Die Schwierigkeit gehört zum Account. Der Server merkt sich die zuletzt gespielte Stufe bei `POST /matches`. Ein abgelehntes Match ändert sie nicht.
- Alte Konten ohne das neue Feld bekommen beim Laden `standard`. So bleibt die Datei aus Phase 2 gültig.
- `offenesMatch()` wertet 404 als Normalfall und liefert `null`. Andere Fehler reicht die Funktion weiter.
- `v-if`, `v-else-if` und `v-else` zeigen genau einen von drei Zuständen: laden, laufendes Spiel, neues Spiel.

## 7. Spielbrett

Dateien `client/src/brett.ts` und `client/src/components/LabyrinthFeld.vue`

### Learnings

- Reine Funktionen wie `mauerUmschalten` und `schatzSetzen` liefern einen neuen Entwurf oder `null` als Absage. Sie lassen sich ohne Vue testen.
- In einer Funktion gibt es nur die Namen aus ihrer Klammer. Beispielnamen aus Hinweisen, Typnamen und Text ohne Anführungszeichen sind dort ungültig.
- Ein CSS-Raster mit 6 Zellen und 5 schmalen Mauerspuren je Richtung bildet das Brett. Die Mauernamen entstehen von links nach rechts und von oben nach unten und haben so von selbst die Serverform `A1_A2`.
- Die Komponente zeigt nur an und meldet Klicks mit `emit`. Was ein Klick bewirkt, entscheidet die View.
- Vue-Komponenten brauchen Namen aus zwei Wörtern (`LabyrinthFeld`). Sonst verwechselt man sie mit HTML-Elementen.

## 8. Countdown, Prüfanzeige und Irrgarten setzen

Dateien `client/src/countdown.ts` und `client/src/views/SpielView.vue`

### Learnings

- Optimistisches Update: Ein Klick ändert den Entwurf sofort, danach speichert der Client ihn. Jede Speicherung bekommt eine Nummer, nur die Antwort auf die neueste zählt. So springt das Feld bei schnellen Klicks nie zurück.
- Die Uhr im Browser kann falsch gehen. Der Client merkt sich den Unterschied zu `serverZeit` und rechnet die Restzeit damit aus.
- "Irrgarten setzen" wartet auf die letzte Speicherung. Sonst prüft der Server einen alten Stand.
- Der Button bleibt gesperrt, bis die Prüfung "Schatz erreichbar" meldet (ADR-007). Der Server lehnt ein unlösbares Setzen zusätzlich mit 422 ab.
- Eine Mauer erscheint nur rot, solange sie steht. Die Prüfung des Servers kann kurz hinterherhinken.

### Code

```ts
async function speichern(neu: LabyrinthEntwurf) {
  const nr = ++speicherNr
  const antwort = await put<Match>(`/matches/${props.id}/labyrinth`, neu)
  // Eine ältere Antwort, die erst jetzt eintrifft, wird verworfen
  if (nr === speicherNr) uebernehmen(antwort)
}
```

## 9. Spielphase

Dateien `client/src/views/SpielView.vue`, `client/src/brett.ts` und `client/src/anzeige.ts`

### Learnings

- Im Spiel sind nur Felder in Zeile und Spalte der Figur klickbar. Ungültige Anfragen entstehen gar nicht erst, der Server prüft trotzdem.
- Die Antwort enthält Ergebnis, Zug des Computers und neuen Stand. Der Client spielt den Computerzug mit Pausen ab, damit man ihn verfolgen kann.
- Das Polling setzt aus, solange eigene Änderungen unterwegs sind. Es übernimmt nur Stände mit höherer `version` und hört nach Spielende auf.
- `export` ist in `<script setup>` verboten. Konstanten wie `POLL_MS` stehen deshalb in `countdown.ts`.

## 10. Simulation der Schwierigkeit

Datei `server/spiellogik/schwierigkeit_test.ts`

### Learnings

- Die Schwierigkeit wirkt nur über das Labyrinth des Computers (ADR-004, ADR-015). Der Sucher ist auf allen Stufen gleich.
- 300 Partien je Stufe belegen die Abstufung. Der Sucher braucht im Schnitt etwa 11 Anfragen bei `einfach`, 20 bei `standard` und 33 bei `schwer`.
- Der Umsetzungsplan sprach von einer "Strategie je Schwierigkeit". Das widersprach zwei akzeptierten ADRs und dem Klartext. Der Plan ist korrigiert. Bei Widersprüchen gelten ADRs und Klartext.

## 11. Testen

- `festerZufall` und eine feste Uhr machen ganze Partien vorhersagbar.
- Ein Test kann ein internes Objekt nach dem Anlegen verändern, zum Beispiel das Labyrinth des Computers austauschen. Der eigene `MatchSpeicher` im Test macht das möglich.
- `assertStrictEquals` prüft, ob es dasselbe Objekt ist, `assertEquals` nur den Inhalt.
- Im Client hält ein Test Antworten fest und gibt sie in falscher Reihenfolge frei. So lässt sich das Verhalten bei schnellen Klicks prüfen.
- `vi.useFakeTimers({ toFake: [...] })` täuscht nur ausgewählte Uhren vor. `flushPromises` braucht weiter echte Zeitgeber.
- `enableAutoUnmount(afterEach)` baut jede View nach dem Test ab. Sonst fragt ihr Polling in den nächsten Test hinein.
- `beispielMatch({ ... })` liefert ein vollständiges Match. Jeder Test überschreibt nur, was ihn betrifft.

## 12. Werkzeuge und Arbeitsweise

- Ein Commit soll für sich kompilieren. Erst kommt, was gebraucht wird, danach, was es benutzt. `git reset --soft HEAD~n` nimmt n Commits zurück und behält alle Änderungen, solange nichts gepusht ist.
- `git restore --staged <pfad>` nimmt Dateien aus dem Staging, ohne sie zu ändern. Der Pfad darf nicht fehlen.
- Ein Probelauf über den Vite-Proxy mit `curl` prüft den echten Weg. Testkonten danach aus `server/data/nutzer.json` entfernen.

## Abweichungen und offene Punkte

- `POST /matches` mit `modus: 'duell'` antwortet in Phase 3 mit 400. Das Duell folgt in Phase 5.
- Nach dem Setzen wechselt das Match direkt zu `laeuft`. `startbereit` mit Bereitschafts-Overlay folgt in Phase 4.
- Fristen prüft der Server noch nicht. Die Merkpunkte für Phase 4 stehen in `UmsetzungIrrgarten.md`.
- Der Vertrag hat zwei Ergänzungen bekommen: `GET /matches/current` und das Feld `schwierigkeit` im Nutzer (ADR-027).

## Kontrollfragen

1. Warum wirft die Match-Schicht `ApiFehler`, die Spiellogik aber nicht?
2. Warum darf `ansichtFuer` kein `...match` verwenden?
3. Warum prüft `GET /matches/:id` die Teilnahme vor dem 304?
4. Was passiert ohne die Speichernummer, wenn zwei Antworten in falscher Reihenfolge ankommen?
5. Warum wartet "Irrgarten setzen" auf die letzte Speicherung?
6. Wie belegt das Projekt, dass "schwer" wirklich schwerer ist?
