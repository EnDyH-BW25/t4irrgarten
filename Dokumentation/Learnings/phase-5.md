# Learnings Phase 5 - Live-Duell

Phase 5 bringt das Spiel gegen einen Menschen. Ein Spieler erstellt ein Duell und gibt den Spielcode weiter. Sein Freund tritt mit dem Code bei. Danach läuft alles wie gegen den Computer, nur ohne Computerzug. Die Phase umfasst sieben Schritte.

1. Vertrag und Typen
2. Spielcode und Duell anlegen
3. Beitreten, Code-Ablauf, Abbrechen und Ansicht
4. Routen
5. Dashboard
6. Warteraum, Duell-Texte und Live-Kasten
7. Durchlauf mit zwei Spielern und Dokumentation

Am Ende der Phase laufen 262 Tests im Server und 115 im Client. Die Entscheidungen stehen in ADR-031 und ADR-032. ADR-009 ist umgesetzt.

## Grundprinzip: Der Ablauf kannte schon zwei Spieler

Phase 3 und 4 haben Auslosung, Fristen, Abruffrist und Ergebnisse für eine Liste von Spielern gebaut. Nur der Computer hat eine Sonderbehandlung (`istComputer`). Für das Duell kamen deshalb nur zwei neue Abläufe dazu, Erstellen und Beitreten. Der Rest lief ohne Änderung.

| Status        | Wer ist im Match  | Neu in Phase 5                           |
| ------------- | ----------------- | ---------------------------------------- |
| `wartet`      | nur der Ersteller | Code, `codeEndeAm`, Abbrechen            |
| `aufbau`      | beide             | Beitritt startet die 3 Minuten           |
| `laeuft`      | beide             | `gegnerAnfragen` für den Live-Kasten     |
| `abgebrochen` | eins oder beide   | Code abgelaufen oder Warteraum verlassen |

## 1. Vertrag und Typen

Dateien `Dokumentation/openapi.yaml`, `shared/types.ts`, `server/match/typen.ts`

### Learnings

- Zwei neue Felder kamen zuerst in den Vertrag, danach in den Code: `codeEndeAm` und `gegnerAnfragen`.
- Der Server speichert pro Spieler `verlauf`. Die Ansicht gibt dem Spieler den `verlauf` des Gegners als `gegnerAnfragen`.
- `anfrageEintragen` ist die einzige Stelle, die eine Anfrage einträgt. Ein neues Feld dort gilt für Mensch und Computer.

## 2. Spielcode und Duell anlegen

Dateien `server/match/spielcode.ts`, `server/match/ablauf.ts`, `server/match/speicher.ts`

### Learnings

- 32 erlaubte Zeichen hoch 5 Stellen ergeben etwa 33 Millionen Codes. Eine Kollision ist selten, `freienCodeErzeugen` würfelt dann neu.
- `freienCodeErzeugen` bekommt die Prüfung als Funktion. So kennt `spielcode.ts` den Speicher nicht und bleibt ohne Server testbar.
- `nachCode` findet nur Matches im Status `wartet`. Nach dem Beitritt ist der Code damit ungültig, ohne eigenes Löschen.

### Code

```ts
let code = codeErzeugen(zufall)
while (istVergeben(code)) code = codeErzeugen(zufall)
return code
```

## 3. Beitreten, Code-Ablauf und Abbrechen

Dateien `server/match/ablauf.ts`, `server/match/fristpruefung.ts`, `server/match/ansicht.ts`

### Learnings

- `beitreten` startet die Aufbauzeit ab dem Beitritt, nicht ab dem Erstellen. Beide Spieler sehen dieselbe Restzeit.
- Der Code-Ablauf ist eine weitere Frist ohne Timer. `codefristPruefen` steht in `fristenPruefen` vor dem Aufbau, wie im Spielablauf.
- Aufgeben im Warteraum bricht ab. Ohne Gegner gibt es keinen Sieger und kein Ergebnis.
- Die Ansicht muss den Code nicht verstecken. Im Status `wartet` ist nur der Ersteller Teilnehmer, alle anderen bekommen 403.

## 4. Routen

Datei `server/match/routen.ts`

### Learnings

- `/join` steht vor `/:id`. Sonst hält Hono "join" für eine Match-Id. Bei `/current` galt dasselbe.
- `/join` trägt zuerst die Fristen des gefundenen Duells nach. Sonst gilt ein abgelaufener Code, den noch niemand abgerufen hat.
- Der Ersteller bekommt beim eigenen Code 409, weil sein wartendes Duell als offenes Match zählt. Dafür braucht die Route keinen Sonderfall.
- Im Duell ist eine Schwierigkeit verboten. Die Route liefert 400, wie es der Vertrag sagt.

## 5. Dashboard

Dateien `client/src/matches.ts`, `client/src/views/DashboardView.vue`

### Learnings

- Alle drei Wege ins Spiel laufen über `starten(anlegen)`. Fehlerbehandlung und Weiterleitung stehen nur einmal da.
- Der Client prüft nur die Länge des Codes. Ob der Code gilt, entscheidet der Server (ADR-002).

## 6. Warteraum und Live-Kasten

Datei `client/src/views/SpielView.vue`

### Learnings

- Der Warteraum ist die Spielansicht im Status `wartet` (ADR-032). Das vorhandene Polling bemerkt den Beitritt am Statuswechsel.
- Der Live-Kasten dreht `gegnerAnfragen` um, damit die neueste Anfrage oben steht.
- Feste Texte wie "Der Computer ist am Zug" heißen jetzt `${gegnerName} ist am Zug`. Der Computer ist dort kein Sonderfall mehr.

## 7. Testen

- `duell_test.ts` spielt ein Duell ohne Routen durch. Zwei feste Labyrinthe und `ZUERST` als Zufall machen den Ablauf vorhersagbar.
- Ein Routentest spielt ein Duell über HTTP bis zu zwei Ergebnissen durch.
- Ein Durchlauf mit `curl` und zwei Cookie-Dateien entspricht zwei Browsern. Der Server lief dabei mit eigenem `data/`-Ordner, damit keine Testkonten in den echten Dateien landen.
- In zsh teilt `$variable` sich nicht in Wörter auf. Ein Header in einer Variable kommt deshalb kaputt an. Shell-Skripte für Tests laufen besser mit `bash`.

## Abweichungen und offene Punkte

- Im Warteraum gibt es keine Abruffrist (ADR-032).
- Die Anfrageliste wächst mit dem Spiel. Bei dieser Spielgröße bleibt sie klein.
- Turnier (Phase 7) bleibt außerhalb des Umfangs.

## Kontrollfragen

1. Warum musste der Spielablauf für das Duell kaum geändert werden?
2. Warum findet `nachCode` nur Duelle im Status `wartet`?
3. Warum prüft `/join` die Fristen, bevor es den Code annimmt?
4. Warum schickt der Server die ganze Anfrageliste und nicht nur die neuen Anfragen?
5. Warum ist der Warteraum keine eigene Seite?
