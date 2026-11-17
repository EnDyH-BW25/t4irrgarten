Umsetzungsplan
Die Reihenfolge folgt den Abhängigkeiten. Jede Phase endet mit einem spielbaren oder testbaren Stand. Das Spiel gegen den Computer kommt vor dem Live-Duell. Es braucht keinen zweiten Menschen und eignet sich deshalb gut zum Testen der Spiellogik.

# Phase 0: Fundament (½ Tag)

- Gemeinsame Typen für Zelle, Mauer, Labyrinth und Match-Status anlegen
- Fehlerformat und Hono-Middleware für Logging und JSON-Fehler
- Client-Grundgerüst mit Layout, Router und API-Hilfsmodul

# Phase 1: Spiellogik als reine Funktionen im Server (1 Tag, Kern des Projekts)

- Koordinaten und Mauern parsen und prüfen ("C4", "A1_A2")
- Erreichbarkeit per BFS von A1 berechnen. Das liefert auch die problematischen Mauern am Rand des erreichbaren Bereichs (`problematischeMauern`).
- Anfrage auswerten mit den Antworten ja, nurBis, nein und schatzGefunden
- Regeln prüfen: höchstens 30 Mauern, Schatz nicht auf A1
- Viele Unit-Tests, denn alle späteren Phasen bauen hierauf auf

# Phase 2: Authentifizierung (½ Tag)

- Registrierung, Login, Logout und /auth/me mit Session-Cookie
- Passwort-Hash, Speicherung in server/data/\*.json (der Pfad steht schon in .gitignore)
- Client: Startbildschirm mit Login und Registrierung, Fehlermeldungen, geschützte Routen

# Phase 3: Spiel gegen den Computer (2 Tage, erster spielbarer Meilenstein)

- Match-Verwaltung im Speicher mit Statusautomat nach `MatchStatus` in shared/types.ts. Phase 3 nutzt aufbau, laeuft und beendet. startbereit und abgebrochen folgen mit der Bereitschaft in Phase 4, wartet folgt mit dem Duell in Phase 5.
- Labyrinth-Generator für den Computer mit den Schwierigkeiten einfach, standard und schwer
- Client: Spielbrett mit zwei 6x6-Feldern, Mauern setzen und entfernen, Zähler, Schatz platzieren
- Live-Anzeige „Schatz erreichbar“ mit Markierung der problematischen Mauern
- „Irrgarten setzen“, Anfragen stellen, eigene Karte mit Spur und entdeckten Mauern
- Computer-Sucher mit einer Strategie für alle Schwierigkeiten. Die Schwierigkeit wirkt nur über das Labyrinth des Computers (ADR-004, ADR-015, ADR-025). Ein Simulationstest belegt die Abstufung.
- Polling mit since=<version> und 304-Antwort. Der Client nutzt dafür `abfragen` aus client/src/api.ts.

# Phase 4: Fristen und Spielende (1 Tag)

- Fristen prüft der Server bei jedem Zugriff, ohne eigenen Timer: 3 Minuten Aufbau, 1 Minute Nachbesserung, 30 Sekunden Bereitschaft, 60 Sekunden pro Zug, 15 Sekunden ohne Abruf (ADR-028). Jede Folge zählt ab dem Fristende.
- Die Prüfung läuft in jeder Route unter `/matches/{id}`, in `GET /matches/current` und in `POST /matches` vor der 409-Antwort. Ein verlassenes Match sperrt den Nutzer nicht.
- Automatisches Setzen: Fehlt der Schatz, legt der Server ihn zufällig. Ist er unerreichbar, folgt eine Minute Nachbesserung, danach öffnet der Server markierte Mauern.
- Status `startbereit` mit Bereitschafts-Overlay und `POST /matches/{id}/ready`. Die Auslosung folgt erst nach der Bestätigung.
- Countdowns für alle Fristen im Client. Die Zugfrist beginnt nach der Wiedergabe des Computerzugs (ADR-030).
- Endansicht mit beiden Labyrinthen und den Anfragen beider Spieler. "Abgebrochen" erscheint ohne Sieger.
- Der Server speichert Ergebnisse selbst in `server/data/ergebnisse.json` (ADR-029). Die Lese-Endpunkte folgen in Phase 6.
- Die Zugfrist bleibt bei 60 Sekunden. Der Vertrag hat die Felder `zugEndeAm` im Match und `anfragen` im Spieler bekommen.

# Phase 5: Live-Duell (1 Tag)

- Spielcode erzeugen (5 Zeichen ohne 0, O, 1, I), Warteraum, Ablauf nach 10 Minuten
- Beitreten per Code, gemeinsamer Timer, Live-Sicht auf die Anfragen des Gegners
- Verbindungsverlust erkennen: 15 Sekunden ohne Abruf zählen als Niederlage
- Umgesetzt: `POST /matches` mit `modus: duell` und `POST /matches/join`. Der Warteraum ist der Status `wartet` der Spielansicht mit Countdown aus `codeEndeAm` (ADR-032).
- Die Live-Sicht nutzt das neue Feld `gegnerAnfragen` und zeigt es im Duell als Kasten über den Spielfeldern (ADR-031).
- Fristen, Abruffrist, Auslosung und Ergebnisse aus Phase 4 gelten ohne Änderung auch für zwei Menschen.

# Phase 6: Dashboard und Ergebnisse (½ Tag)

- `GET /results` und `GET /results/stats` aus dem `ErgebnisSpeicher` (ADR-029)
- Siege, Niederlagen, Quote, letzte 10 Spiele
- Ergebnisliste mit aufklappbaren Details
- Umgesetzt: `server/ergebnis/routen.ts` liefert Seiten über `limit` und `offset` und die Statistik. Die Quote rechnet der Server.
- Das Dashboard zeigt drei Kacheln und die letzten 10 Spiele. Es lädt sie erst nach dem offenen Match (ADR-033).
- Die Ergebnisseite `/ergebnisse` lädt 20 Einträge pro Klick auf "Mehr laden". `minAnfragen` und `effizienz` bleiben offen.

# Phase 7: Turnier (1,5 Tage)

- Warteraum mit bis zu vier Spielern, Host-Rechte, Ablauf nach 30 Minuten
- Auffüllen mit einem Computer-Spieler, Auslosung von Runde 1
- Runde 2 mit Finale und Spiel um Platz 3, Turnierübersicht, Walkover-Regeln

# Phase 8: Abschluss (½ Tag)

- End-to-End-Durchlauf, Fehlermeldungen vervollständigen, Doku und OpenAPI abgleichen
- UML-Diagramm überarbeiten
- Lernreflexion schreiben
- 5 Präsentationsfolien erstellen
- Demo vorbereiten & durchgehen
