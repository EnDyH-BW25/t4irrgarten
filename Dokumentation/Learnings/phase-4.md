# Learnings Phase 4 - Fristen und Spielende

Phase 4 macht das Spiel gegen den Computer vollständig. Der Server prüft alle Fristen, setzt offene Labyrinthe selbst, fragt nach der Bereitschaft und speichert Ergebnisse. Die Phase umfasst acht Schritte.

1. Entscheidungen klären
2. Fristfelder im Match
3. Bereitschaft und Fristprüfung für Start, Zug und Abruf
4. Automatisches Setzen mit Nachbesserung
5. Fristprüfung in allen Routen
6. Ergebnisse speichern
7. Client mit Overlay und Countdowns
8. Dokumentation

Am Ende der Phase laufen 236 Tests im Server und 103 im Client. Die Entscheidungen stehen in ADR-028 bis ADR-030.

## Grundprinzip: Fristen ohne Timer

Der Server startet keinen Timer. Er speichert zu jeder Frist ihr Ende, zum Beispiel `zugEndeAm`. Bei jedem Zugriff vergleicht er die Uhrzeit mit diesen Werten und trägt nach, was fällig ist (ADR-028).

| Frist         | Dauer   | Feld                      | Folge                                   |
| ------------- | ------- | ------------------------- | --------------------------------------- |
| Aufbau        | 3 Min.  | `aufbauEndeAm`            | Server setzt offene Labyrinthe          |
| Nachbesserung | 1 Min.  | `ich.nachbesserungEndeAm` | Server öffnet markierte Mauern          |
| Bereitschaft  | 30 Sek. | `startFristEndeAm`        | Bereiter Spieler gewinnt, sonst Abbruch |
| Zug           | 60 Sek. | `zugEndeAm`               | Spieler am Zug verliert                 |
| Abruf         | 15 Sek. | intern `letzterAbrufAm`   | Spieler verliert wegen Abwesenheit      |

Zugfrist und Abruffrist sind zwei Dinge. Die Zugfrist ist die Bedenkzeit im eigenen Zug. Die Abruffrist misst, wie lange der Browser schweigt. Er fragt alle 1,5 Sekunden von selbst, auch beim Nachdenken.

## 1. Entscheidungen

Dateien `Dokumentation/openapi.yaml`, `Dokumentation/UmsetzungIrrgarten.md`

### Learnings

- Die Zugfrist bleibt bei 60 Sekunden. 45 Sekunden waren als Untergrenze gemeint, nicht als Ziel.
- Der Vertrag hatte kein Feld für das Ende der Zugfrist. Ohne Feld zeigt der Client keinen Countdown. `zugEndeAm` kam zuerst in den Vertrag, danach in den Code (contract-first).

## 2. Fristfelder im Match

Dateien `shared/types.ts`, `server/match/typen.ts`, `server/match/fristen.ts`

### Learnings

- Feldnamen kommen aus dem Vertrag. `zugFristEndeAm` statt `zugEndeAm` erzeugt keinen Fehler, nur einen leeren Countdown. Der Client liest dann `undefined`.
- Im Server sind Zeiten `Date`, im Vertrag Text. `ansicht.ts` wandelt sie mit `toISOString()` um.
- Pro Spieler stehen `startBestaetigt`, `nachbesserungEndeAm` und `letzterAbrufAm`. Pro Match stehen `startFristEndeAm` und `zugEndeAm`. Nachbessern können beide gleichzeitig, am Zug ist immer nur einer.
- `30 * 1000` liest sich besser als `0.5 * 60 * 1000`. Beides ergibt 30 Sekunden.

## 3. Bereitschaft und Fristprüfung

Dateien `server/match/ablauf.ts`, `server/match/fristpruefung.ts`

### Learnings

- Nach dem Setzen folgt `startbereit` statt `laeuft`. Der Computer ist sofort bereit. Erst `bereitBestaetigen` startet das Spiel mit der Auslosung.
- Jede Folge zählt ab dem Fristende, nicht ab dem Abruf. Wer nach zehn Minuten zurückkommt, verliert wegen `abwesenheit` nach 15 Sekunden und nicht wegen `zugfrist` nach 60.
- Im Spiel zählt der früheste Verstoß. Beide Fristen stehen als Kandidaten in einer Liste, sortiert nach ihrem Ende.
- Ein Lebenszeichen erhöht `version` nicht. Sonst antwortet das Polling nie mit 304.

### Code

```ts
const erster = verstoesse.filter((v) => v.am <= jetzt.getTime()).sort((a, b) => a.am - b.am)[0]
```

## 4. Automatisches Setzen

Dateien `server/spiellogik/automatik.ts`, `server/match/fristpruefung.ts`

### Learnings

- `zufaelligerSchatz` wählt eine erreichbare Zelle außer A1. Ist A1 eingemauert, liefert sie `null`.
- `labyrinthVervollstaendigen` öffnet zufällig eine Mauer am Rand des erreichbaren Bereichs, bis der Schatz erreichbar ist. Jede Öffnung vergrößert den Bereich, deshalb endet die Schleife sicher.
- Kein Schatz heißt sofort legen. Ein unerreichbarer Schatz heißt eine Minute Nachbesserung. So steht es im Klartext.
- Die Startfrist zählt ab dem Moment, in dem das letzte Labyrinth stand.
- In eine Funktion gehören die Namen aus ihrer eigenen Klammer. `erreichbareZellen(mauern)` statt `erreichbareZellen(erreichbareZellen)`.

### Code

```ts
const kandidaten = [...erreichbareZellen(mauern)].filter((zelle) => zelle !== 'A1')
if (kandidaten.length === 0) return null
return kandidaten[Math.floor(zufall() * kandidaten.length)]
```

## 5. Fristprüfung in allen Routen

Datei `server/match/routen.ts`

### Learnings

- `matchHolen` arbeitet in fester Reihenfolge: Teilnahme, Fristen, Lebenszeichen. Fremde lösen keine Fristen aus. Eine Rückkehr tilgt keine abgelaufene Abruffrist.
- Weil jede Route ihr Match über `matchHolen` holt, kann keine Route die Prüfung vergessen.
- `offenesMatch` trägt die Fristen für `/current` und `POST /matches` nach. Ist das Match danach vorbei, gibt es kein offenes Match mehr.
- Eine verstellbare Uhr im Test (`vorspulen(15_000)`) prüft Fristen über echte HTTP-Anfragen.

## 6. Ergebnisse speichern

Dateien `server/jsonDatei.ts`, `server/ergebnis/speicher.ts`, `server/match/ergebnis.ts`

### Learnings

- Das sichere Schreiben steht jetzt einmal in `JsonDatei`. Nutzer und Ergebnisse nutzen dieselbe Klasse.
- `eintragen` ist idempotent. Ein zweiter Aufruf für dasselbe Match ändert nichts. Die Routen dürfen `ergebnisseSichern` deshalb an mehreren Stellen aufrufen.
- Die Match-Schicht schreibt keine Dateien. Erst die Routen speichern. So bleiben Tests der Spielabläufe ohne Dateizugriff.
- `beendetAm` ist bei einer Frist deren Ende. Sonst steht in der Ergebnisliste die Zeit der Rückkehr.

## 7. Client mit Overlay und Countdowns

Datei `client/src/views/SpielView.vue`

### Learnings

- Ein Overlay ist ein Kasten über der abgedunkelten Seite. Im Status `startbereit` fragt er "Bist du bereit zu spielen?" und schickt `POST /ready`.
- Eine berechnete Eigenschaft `frist` wählt je nach Status die passende Frist. Ein Countdown zeigt sie alle.
- Nach dem Setzen übernimmt der Client das Labyrinth des Servers. So sieht der Spieler einen automatisch gelegten Schatz.
- Während der Wiedergabe des Computerzugs fragt der Client weiter ab. Sonst verliert er bei langen Zügen wegen Abwesenheit. Ein Test hat gezeigt, dass die Sperre an zwei Stellen saß.
- Die Zugfrist beginnt erst nach der Wiedergabe (ADR-030). Sonst kostet ein langer Computerzug Bedenkzeit.
- Die Endansicht zeigt die Anfragen beider Spieler. Dafür hat `Spieler` das Feld `anfragen` bekommen, wie es der Klartext verlangt.

## 8. Testen

- Eine feste Uhr und `nach(ms)` machen Fristen exakt prüfbar. Ein Test prüft eine Millisekunde vor und genau am Fristende.
- Ketten von Fristen prüft ein Aufruf mit einer Uhrzeit weit in der Zukunft.
- Eigenschaftstests mit 200 zufälligen Entwürfen belegen, dass `labyrinthVervollstaendigen` immer ein lösbares Labyrinth liefert und nie eine Mauer hinzufügt.
- Ein Test kann einen Zustand herstellen, den der Modus `computer` nie erreicht. So ist der Abbruch für das Duell schon geprüft.

## Abweichungen und offene Punkte

- Die Lese-Endpunkte für Ergebnisse folgen in Phase 6. ADR-014 gilt bis dahin als teilweise umgesetzt.
- `minAnfragen` und `effizienz` fehlen im Ergebnis. Sie gehören zur offenen Punktevergabe.
- Beendete Matches bleiben bis zum Neustart im Speicher.
- Der Vertrag hat drei Ergänzungen bekommen: `zugEndeAm` im Match, `anfragen` im Spieler und die Verlängerung der Zugfrist nach dem Computerzug.

## Kontrollfragen

1. Warum braucht der Server keinen Timer für die Fristen?
2. Warum zählt eine Folge ab dem Fristende und nicht ab dem Abruf?
3. Warum prüft `matchHolen` die Fristen vor dem Lebenszeichen?
4. Was ist der Unterschied zwischen Zugfrist und Abruffrist?
5. Warum darf `ergebnisseSichern` mehrmals für dasselbe Match laufen?
6. Warum beginnt die Zugfrist erst nach der Wiedergabe des Computerzugs?
