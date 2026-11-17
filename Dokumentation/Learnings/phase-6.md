# Learnings Phase 6 - Dashboard und Ergebnisse

Phase 6 macht die gespeicherten Ergebnisse sichtbar. Der Server speichert sie seit Phase 4 beim Spielende (ADR-029). Neu sind die Wege zum Lesen und die Anzeige im Client. Die Phase umfasst vier Schritte.

1. Server mit Statistik und Lese-Routen
2. Statistik und letzte Spiele im Dashboard
3. Ergebnisseite mit Details
4. Dokumentation

Am Ende der Phase laufen 269 Tests im Server und 126 im Client. Die Entscheidungen stehen in ADR-033. ADR-014 ist umgesetzt.

## Grundprinzip: Der Server rechnet, der Client zeigt an

Der Client trägt keine Ergebnisse ein und rechnet keine Quote. Er liest nur. So bleibt der Server Schiedsrichter (ADR-002, ADR-014).

| Endpunkt               | Liefert                           | Genutzt von                    |
| ---------------------- | --------------------------------- | ------------------------------ |
| `GET /results/stats`   | Siege, Niederlagen, Quote         | Dashboard                      |
| `GET /results`         | eine Seite, neueste zuerst        | Dashboard, Ergebnisseite       |
| `GET /matches/current` | offenes Match, trägt Fristen nach | Dashboard, vor den Ergebnissen |

## 1. Server

Dateien `shared/types.ts`, `server/ergebnis/speicher.ts`, `server/ergebnis/routen.ts`, `server/main.ts`

### Learnings

- `statistik` liefert ohne Spiele die Quote 0. `0 / 0` ergibt in JavaScript `NaN`, und `NaN` ist kein gültiges JSON.
- `slice(offset, offset + limit)` schneidet die Seite aus der sortierten Liste. Eine kürzere letzte Seite ist kein Fehler.
- Query-Parameter kommen als Text an. `zahlLesen` prüft sie wie `sinceLesen` aus Phase 3 und meldet 400 mit Feldname.
- Die Antwort enthält keine `nutzerId`. `alsErgebnis` kopiert jedes Feld einzeln, seit Phase 4.

### Code

```ts
const eigene = this.eintraege.filter((e) => e.nutzerId === nutzerId)
const siege = eigene.filter((e) => e.ausgang === 'sieg').length
return {
  siege,
  niederlagen: eigene.length - siege,
  quote: eigene.length === 0 ? 0 : siege / eigene.length,
}
```

## 2. Dashboard

Dateien `client/src/ergebnisse.ts`, `client/src/anzeige.ts`, `client/src/views/DashboardView.vue`

### Learnings

- Die Reihenfolge der Abrufe zählt. `/matches/current` beendet ein abgelaufenes Match und speichert sein Ergebnis. Erst danach stimmt die Statistik (ADR-028, ADR-033).
- `Promise.all` holt Statistik und Liste gleichzeitig. Beide hängen nicht voneinander ab.
- Nach "Aufgeben" lädt das Dashboard alles neu, damit die Niederlage sofort erscheint.
- Neue Abrufe brechen alte Tests. Der Helfer `dashboardServer` ergänzt Standardantworten für die neuen URLs.

## 3. Ergebnisseite

Dateien `client/src/views/ErgebnisseView.vue`, `client/src/router/index.ts`

### Learnings

- `offset` ist die Zahl der schon geladenen Einträge. Eine kürzere Seite heißt, dass nichts mehr kommt.
- Endet zwischen zwei Seiten ein Spiel, verschiebt sich alles um einen Platz. Der Client filtert Einträge mit bekannter `id` heraus.
- `<details>` und `<summary>` klappen ohne eigenen Zustand auf.
- Die neue Route ist ohne Zusatz geschützt, weil der Router-Guard jede Route ohne `meta.oeffentlich` schützt (ADR-024).

## 4. Testen

- Die Routentests füllen den Ergebnisspeicher direkt. Ganze Partien sind für das Lesen nicht nötig.
- Ein Dashboard-Test prüft die Reihenfolge der Abrufe über die Aufrufliste der Attrappe.
- Der Durchlauf mit `curl` am echten Server bestätigt Statistik, Liste ohne `nutzerId` und 400 bei `limit=0`.

## Abweichungen und offene Punkte

- `minAnfragen` und `effizienz` aus dem Vertrag fehlen weiter. Sie gehören zur offenen Punktevergabe.
- Ein direkter Aufruf von `/ergebnisse` zeigt ein gerade durch Zeitablauf beendetes Match erst nach einem Besuch des Dashboards (ADR-033).
- Die Zeile für Turnier und Runde steht bereit, bleibt aber ohne Phase 7 leer.

## Kontrollfragen

1. Warum gibt es für Ergebnisse kein POST?
2. Warum lädt das Dashboard erst das offene Match und dann die Statistik?
3. Woran erkennt die Ergebnisseite, dass keine weiteren Einträge kommen?
4. Warum liefert die Statistik ohne Spiele die Quote 0?
