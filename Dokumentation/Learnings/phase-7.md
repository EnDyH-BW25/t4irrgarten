# Learnings Phase 7 - Turnier

Phase 7 baut das Turnier mit vier Spielern und zwei Runden. Ein Computer füllt auf, wenn nur drei Menschen da sind. Die Phase umfasst sieben Schritte.

1. Vertrag und Typen
2. Warteraum und Start im Server
3. Fortschreiben: Runde 2, Walkover, Platzierung, Abbruch
4. Routen `/competitions` und Sperre
5. Turnier im Dashboard
6. Turnierseite und Rückweg aus dem Match
7. Dokumentation

Am Ende der Phase laufen 298 Tests im Server und 141 im Client. Die Entscheidungen stehen in ADR-034 bis ADR-036. ADR-010 und ADR-011 sind umgesetzt.

## Grundprinzip: Das Turnier ist eine Hülle

Ein Turnier-Match ist kein neuer Match-Typ. Gegen den Computer ist es ein Computer-Match. Zwei Menschen spielen ein Duell, dem der Gegner sofort beitritt. Das Turnier setzt nur `competitionId` und `runde` und merkt sich pro Paarung die `matchId`. Aufbau, Fristen, Live-Sicht und Ergebnisse laufen wie in Phase 3 bis 5.

| Endpunkt                                    | Wirkung                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `POST /competitions`                        | Host legt an, Code gilt 30 Minuten               |
| `POST /competitions/join`                   | Beitritt mit Code, 404 bei Duell-Code            |
| `GET /competitions/current`                 | offenes Turnier, auch zwischen zwei Runden       |
| `GET /competitions/{id}`                    | Stand, schreibt fort (Runde 2, Platzierung)      |
| `POST /competitions/{id}/start`             | nur Host, ab 3 Spielern, lost Runde 1 aus        |
| `DELETE /competitions/{id}/participants/me` | Warteraum verlassen, beim Host endet das Turnier |

## 1. Vertrag und Typen

Dateien `shared/types.ts`, `server/match/typen.ts`, `Dokumentation/openapi.yaml`

### Learnings

- `Turnier`, `Runde`, `Paarung` und `Platzierung` folgen den Schemas der openapi. `platzUm` ist in Runde 1 leer.
- `TURNIER_GROESSE` und `TURNIER_MIN_START` liegen in `shared`, damit Server und Client dieselben Zahlen nutzen.
- `MatchIntern` kennt jetzt `competitionId` und `runde`. Ansicht und Ergebnis reichen beides weiter.

## 2. Warteraum und Start

Dateien `server/turnier/typen.ts`, `server/turnier/ablauf.ts`, `server/turnier/speicher.ts`

### Learnings

- Fisher-Yates mischt die Teilnehmer gleichmäßig. Danach spielen Platz 1 gegen 2 und Platz 3 gegen 4.
- Es gibt höchstens einen Computer. Computer gegen Computer ist deshalb unmöglich, der Test prüft es mit 20 Auslosungen.
- Die Funktionen werfen `ApiFehler` selbst, wie die Match-Schicht: 403 für Fremde und Nicht-Hosts, 409 `COMPETITION_VOLL` und `ZU_WENIG_SPIELER`.

### Code

```ts
if (a.istComputer || b.istComputer) {
  const mensch = a.istComputer ? b : a
  match = computerMatchErstellen(mensch, turnier.schwierigkeit, jetzt, zufall)
} else {
  match = duellErstellen(a, '', jetzt)
  beitreten(match, b, jetzt)
}
match.competitionId = turnier.id
match.runde = runde
```

## 3. Fortschreiben

Dateien `server/turnier/fortschreiben.ts`, `server/ergebnis/speicher.ts`, `server/match/ansicht.ts`

### Learnings

- `turnierFortschreiben` hat vier Fälle: Match abgebrochen, Runde läuft noch, Runde 1 fertig, Runde 2 fertig.
- `AUSSCHEIDEN` listet die Endegründe, nach denen jemand nicht mehr antritt. Sein Match in Runde 2 endet sofort mit `walkover`.
- Sind beide Spieler einer Paarung ausgeschieden, bricht das Turnier ab (ADR-035).
- Beim Walkover fiel ein alter Fehler auf. Die Endansicht wollte das Labyrinth eines Gegners zeigen, der nie gesetzt hatte. Das gab 500, auch beim Aufgeben im Aufbau eines Duells. Ein Regressionstest sichert die Behebung.

## 4. Routen und Sperre

Dateien `server/turnier/nachtragen.ts`, `server/turnier/routen.ts`, `server/turnier/ansicht.ts`, `server/match/routen.ts`, `server/main.ts`

### Learnings

- `turnierNachtragen` ist das Gegenstück zu `fristenPruefen` für Turniere. Jeder Abruf ruft es zuerst auf.
- Match- und Turnier-Routen teilen sich den `Spielstand`. So prüfen beide dieselbe Sperre mit `offenesMatch` und `offenesTurnier`.
- Ein neuer Code darf weder einem wartenden Duell noch einem wartenden Turnier gehören.
- Im Test lieferte der Zufall immer 0. Jeder Code war `AAAAA`, und die Suche nach einem freien Code lief endlos. Ein fester Zufall mit Startwert löst das.

## 5. Dashboard

Dateien `client/src/turniere.ts`, `client/src/api.ts`, `client/src/anzeige.ts`, `client/src/views/DashboardView.vue`

### Learnings

- Die Abrufe laufen in drei Stufen: offenes Match, offenes Turnier, dann Statistik und Liste.
- `starten()` liefert jetzt den Zielpfad. Spiel und Turnier teilen sich so die Behandlung von 409.
- Duell und Turnier haben getrennte Code-Felder (Klartext).

## 6. Turnierseite

Dateien `client/src/views/TurnierView.vue`, `client/src/views/SpielView.vue`, `client/src/views/ErgebnisseView.vue`, `client/src/router/index.ts`

### Learnings

- Eine Seite für Warteraum, Übersicht und Wartebildschirm. Der Status entscheidet, welcher Teil erscheint.
- `uebernehmen()` springt ins Match, sobald `meinNaechstesMatchId` gesetzt ist.
- `rueckweg` in der Spielansicht führt im Turnier zur Übersicht.
- Die Ergebnisseite zeigt Runde und Endplatz.

## 7. Testen

- Server: Tests für Ablauf, Fortschreiben und Routen. Ein Routentest spielt ein ganzes Turnier mit Walkover bis zur Platzierung in den Ergebnissen.
- Client: Tests für Dashboard, Turnierseite, Rückweg und Ergebnisse.
- `curl` am echten Server mit drei Spielern: Beitritt mit Kleinbuchstaben, 403 für den Nicht-Host, Start mit Computer, Sperre 409.

## Abweichungen und offene Punkte

- Runde 2 entsteht erst beim nächsten Abruf. Wer auf der Endansicht bleibt, verliert Aufbauzeit (ADR-036).
- Turniere leben nur im Arbeitsspeicher. Ein Neustart beendet sie.
- Die Competition hat kein `version`, das Polling fragt ohne `since`.

## Kontrollfragen

1. Warum gibt es keinen eigenen Match-Typ für Turniere?
2. Wann und wodurch entsteht Runde 2?
3. Wer verliert ein Match kampflos, und was passiert, wenn beide Spieler ausgeschieden sind?
4. Warum kann der Computer nie gegen sich selbst spielen?
5. Warum blockiert ein Turnier auch zwischen zwei Runden ein neues Spiel?
