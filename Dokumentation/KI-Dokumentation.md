# KI-Dokumentation Irrgarten

Stand 18.11.2026. Diese Datei weist nach, wo und wie im Projekt KI-Werkzeuge zum Einsatz kamen. Sie trennt dabei zwischen meinen eigenen Entscheidungen und den Beiträgen der KI.

## Eingesetzte Werkzeuge

| Werkzeug    | Anbieter  | Zugang                 | Einsatz                                                       |
| ----------- | --------- | ---------------------- | ------------------------------------------------------------- |
| Claude      | Anthropic | claude.ai (Chat)       | Planung vor dem Projektstart, erste ADRs                      |
| Claude Code | Anthropic | Erweiterung in VS Code | Umsetzung, Tests, Dokumentation, Prüfungsvorbereitung, Abgabe |
| Gemini      | Google    | Chat                   | Idee, die Anwendungsfälle als Klartext-Datei zu beschreiben   |

Andere KI-Werkzeuge wie GitHub Copilot oder ChatGPT kamen nicht zum Einsatz.

## Einsatz nach Projektabschnitt

### Planung

- **Gemini** lieferte die Idee, die Anwendungsfälle zuerst in einfacher Sprache aus Sicht des Spielers aufzuschreiben. Den Inhalt von `Irrgarten_Klartext.md` habe ich selbst geschrieben und mit Feedback von Claude überarbeitet.
- **Claude (Chat)** begleitete die Planung vor dem Projektstart. Daraus entstanden ADR-001 bis ADR-015. Die Entscheidungen darin habe ich getroffen. Claude hat Varianten vorgeschlagen, Vor- und Nachteile aufgezeigt und die Texte formuliert.
- **Claude** formulierte den Umsetzungsplan `UmsetzungIrrgarten.md` und den API-Vertrag `openapi.yaml` auf Basis von Klartext und ADRs.

### Umsetzung

Die Umsetzung lief in Phasen 0 bis 7 mit Claude Code. Die Arbeitsweise änderte sich im Lauf des Projekts.

| Abschnitt     | Arbeitsweise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 bis 3 | Claude erklärte jeden Schritt vorab und lieferte Code-Vorlagen für komplexere Funktionen in kleinen Stücken. Typen in `shared/types.ts` und `client/src/anmeldung.ts` schrieb ich selbst. Claude korrigierte meine Fehler und erklärte sie. In `match/ansicht.ts`, `match/speicher.ts` und `client/src/matches.ts` bspw. versuchte ich mich mit Claudes Unterstützung durch Fragen und Denkanstöße Schritt für Schritt selbst an den Funktionen. Claude korrigierte sie und ergänzte, was ich durch zu oberflächliches Denken nicht vollständig erfasst und niedergeschrieben habe. |
| Ab Phase 4    | Aufgrund des Zeitdrucks schrieb Claude den Code vollständig. Claude erklärte jeden Schritt mit einem Durchlauf mit Beispielwerten. Ich prüfte, testete und committete selbst.                                                                                                                                                                                                                                                                                                                                                                                                       |

Claude schrieb alle automatisierten Tests in Server und Client. Die Testfälle hat Claude mir nach Normalfall, Grenzfall und falscher Eingabe erklärt.

### Dokumentation

- ADR-016 bis ADR-040 hat Claude formuliert. Jede ADR hält eine Entscheidung fest, die ich vorher gefordert, bestätigt oder selbst getroffen habe. Beispiele für eigene Entscheidungen sind die Schatzplatzierung nach Schwierigkeit des Wegs (ADR-025) und die Schwierigkeit im Account (ADR-027).
- Die Learnings pro Phase in `Learnings/` entstanden im Gespräch mit Claude am Ende jeder Phase.
- Die Kommentare im Code und die Erklärblöcke am Dateianfang hat Claude als Hilfestellung für mich geschrieben.
- `README.md` und diese KI-Dokumentation hat Claude auf Basis des Repositorys entworfen. Ich habe beide geprüft. Die KI Dokumentation habe ich nochmals angepasst und präzisiert.
- `design.md` mit Schriften und Farben stammt von mir.

### Prüfungsvorbereitung

Claude ging mit mir jede Phase nach einem festen Schema durch. Das Schema umfasste Ziel der Phase, wichtige Codeblöcke, erwartbare Prüfungsfragen mit Antworten und kleine Änderungsaufgaben am Code.

## Eigenleistung

- Die Wahl des Spiels und die Spielregeln als Vorlage
- Alle fachlichen Entscheidungen, also Spielablauf, Fristen, Schwierigkeitsstufen, Duell, Turnier und Ergebnisse
- Der Inhalt der Anwendungsfälle in `Irrgarten_Klartext.md`
- Das Design mit Schriften, Farben und Animationen
- Die Freigabe jeder Entscheidung, bevor sie als ADR in die Dokumentation einging
- Die Reihenfolge und den Umfang der Phasen, etwa die Entscheidung, das Turnier doch umzusetzen
- Das manuelle Testen im Browser und alle Commits

## Wie ich die KI-Ergebnisse geprüft habe

- **Automatisierte Tests.** Jeder Schritt endete mit grünen Tests. Zum Stand der Abgabe laufen 298 Server-Tests und 148 Client-Tests ohne Fehler.
- **Manuelle Tests.** Ich habe jede Phase im Browser durchgespielt, Duelle mit drei Browserfenstern in Chrome und Edge.
- **Abgleich mit der Dokumentation.** Vor jedem Schritt verglich Claude den Plan mit Klartext und ADRs. Bei Widersprüchen galt meine Entscheidung aus ADR und Klartext, auf die ich Claude explizit hingewiesen habe.
- **Erklärungen.** Ich habe mir jeden Codeschritt erklären lassen und bei Unklarheiten nachgefragt.

## Fehler der KI und wie ich sie gefunden habe

| Fehler                                                                                                                                                        | Wie entdeckt                                        | Folge                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Der Umsetzungsplan sah eine eigene Suchstrategie des Computers je Schwierigkeit vor. Das widersprach meiner Entscheidung in ADR-004, ADR-015 und im Klartext. | Abgleich des Plans mit den ADRs in Phase 3          | Plan korrigiert. Die Schwierigkeit wirkt nur über das Labyrinth. |
| Der erste Computer-Sucher lief in eine Endlosschleife und pendelte in einem bekannten Gang hin und her.                                                       | Test, der eine ganze Partie durchspielt             | Neue Regel im Sucher, die zur nächsten Zelle mit Neuland führt.  |
| Der Code setzte die Regel aus ADR-007 nicht um. Der Button "Irrgarten setzen" war trotz unlösbarem Labyrinth aktiv.                                           | Abgleich des Codes mit den ADRs am Ende von Phase 3 | Button bleibt gesperrt, bis der Schatz erreichbar ist.           |
| Ein erster Vorschlag zur Schatzwahl legte den Schatz nur nach Weglänge fest.                                                                                  | Mein Einwand im Gespräch                            | Neue Bewertung nach Abbiegungen und Abzweigungen, siehe ADR-025. |

## Kennzeichnung im Repository

- Drei Commits tragen den Vermerk `Co-Authored-By: Claude`. Alle anderen Commits habe ich selbst erstellt, auch wenn der Code darin von Claude stammt.
- Das Repository enthält die vollständige Historie seit dem 30.09.2026. Sie zeigt den schrittweisen Aufbau des Projekts.

## Reflexion

Die KI hat das Projekt in diesem Umfang erst möglich gemacht. Ohne sie hätte ich Duell und Turnier nicht in der verfügbaren Zeit fertigstellen können. Der hohe Anteil an KI-Code hatte aber einen Preis. Ich musste mir das System nachträglich erarbeiten, um es erklären zu können. Hilfestellungen in Form von Lückenhaftem Code mit Platzhaltern haben mich mehrfach überfordert. Besser funktionierte es, fertigen Code mit einem Durchlauf mit konkreten Werten erklärt zu bekommen oder zuvor Fragen zur Denkweise gestellt zu bekommen bzw. dazu, was in dem jeweiligen Code-Block mit den Daten passieren muss, um das zu erreichen, was der Block tun soll.

Die ausführliche Lernreflexion zum Modul wird entsprechend der Anforderungen getrennt abgegeben.
