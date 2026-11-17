# Architecture Decision Records Irrgarten

Stand 17.11.2026. Das Format folgt dem Mini-ADR aus dem Skript mit Kontext, Entscheidung, Begründung und Konsequenzen.

Die Datei sammelt alle Entscheidungen des Projekts nach Thema. Eine akzeptierte ADR bleibt unverändert. Ändert sich eine Entscheidung, entsteht eine neue ADR. Die alte erhält den Status "Ersetzt durch ADR-0XX".

Die Übersicht trennt zwei Angaben.

- **Status** sagt, ob die Entscheidung gilt.
- **Umsetzung** sagt, ob der Code sie schon enthält. Die Werte sind umgesetzt, teilweise und geplant.

## Übersicht

| Nr      | Titel                                               | Phase       | Status                                   | Umsetzung |
| ------- | --------------------------------------------------- | ----------- | ---------------------------------------- | --------- |
| ADR-001 | Anwendungsfälle in Klartext vor dem API-Vertrag     | Planung     | Akzeptiert                               | umgesetzt |
| ADR-002 | Server als Schiedsrichter                           | Planung     | Akzeptiert                               | umgesetzt |
| ADR-003 | Koordinaten und Mauermodell                         | Planung     | Akzeptiert                               | umgesetzt |
| ADR-004 | Labyrinth-Generierung und Schwierigkeit             | Planung     | Akzeptiert                               | umgesetzt |
| ADR-005 | Anfragen entlang von Zeile oder Spalte              | Planung     | Akzeptiert                               | umgesetzt |
| ADR-006 | Aufbauphase unter Kontrolle des Servers             | Planung     | Akzeptiert                               | teilweise |
| ADR-007 | Lösbarkeitsprüfung mit Nachbesserung                | Planung     | Akzeptiert                               | umgesetzt |
| ADR-008 | Bereitschaftsprüfung und Abwesenheit                | Planung     | Akzeptiert                               | umgesetzt |
| ADR-009 | Spielcode für das Duell                             | Planung     | Akzeptiert                               | umgesetzt |
| ADR-010 | Turnier mit Host, Warteraum und Computer-Auffüllung | Planung     | Akzeptiert                               | umgesetzt |
| ADR-011 | Turnierablauf, Ausstieg und Abbruch                 | Planung     | Akzeptiert                               | umgesetzt |
| ADR-012 | Aktualisierung per Polling                          | Planung     | Akzeptiert                               | teilweise |
| ADR-013 | Kein Gastmodus                                      | Planung     | Akzeptiert                               | umgesetzt |
| ADR-014 | Ergebnisse vom Server, Statistik statt Rangliste    | Planung     | Akzeptiert                               | umgesetzt |
| ADR-015 | Dashboard, Schwierigkeit und Einstellungen          | Planung     | Akzeptiert                               | teilweise |
| ADR-016 | Technologie-Stack                                   | Einrichtung | Akzeptiert                               | umgesetzt |
| ADR-017 | Gemeinsame Typen im Ordner shared                   | 0           | Akzeptiert                               | umgesetzt |
| ADR-018 | Einheitliches Fehlerformat im Server                | 0           | Akzeptiert                               | umgesetzt |
| ADR-019 | API-Modul im Client mit Netzwerkfehler              | 0           | Akzeptiert                               | umgesetzt |
| ADR-020 | Vite-Proxy statt CORS                               | 0           | Akzeptiert                               | umgesetzt |
| ADR-021 | Mauern als normierte Strings und reine Funktionen   | 1           | Akzeptiert                               | umgesetzt |
| ADR-022 | Passwort-Hash mit PBKDF2                            | 2           | Akzeptiert                               | umgesetzt |
| ADR-023 | Sessions im Speicher und Nutzer in JSON-Datei       | 2           | Akzeptiert                               | umgesetzt |
| ADR-024 | Anmeldezustand im Client und geschützte Routen      | 2           | Akzeptiert                               | umgesetzt |
| ADR-025 | Schatzplatzierung nach Schwierigkeit des Wegs       | 3           | Akzeptiert                               | umgesetzt |
| ADR-026 | Match-Schicht im Speicher mit eigener Ansicht       | 3           | Akzeptiert                               | umgesetzt |
| ADR-027 | Offenes Match und Schwierigkeit im Account          | 3           | Akzeptiert                               | umgesetzt |
| ADR-028 | Fristen ohne Timer bei jedem Zugriff                | 4           | Akzeptiert                               | umgesetzt |
| ADR-029 | Ergebnisse in einer JSON-Datei beim Spielende       | 4           | Akzeptiert                               | umgesetzt |
| ADR-030 | Zugfrist erst nach der Wiedergabe des Computerzugs  | 4           | Akzeptiert, Pause geändert durch ADR-037 | umgesetzt |
| ADR-031 | Live-Sicht über die Anfrageliste des Gegners        | 5           | Akzeptiert                               | umgesetzt |
| ADR-032 | Warteraum als Status der Spielansicht               | 5           | Akzeptiert                               | umgesetzt |
| ADR-033 | Ergebnisse seitenweise und nach dem offenen Match   | 6           | Akzeptiert                               | umgesetzt |
| ADR-034 | Turnier als Hülle um normale Matches                | 7           | Akzeptiert                               | umgesetzt |
| ADR-035 | Ausscheiden, Walkover und Abbruch im Turnier        | 7           | Akzeptiert                               | umgesetzt |
| ADR-036 | Turnierseite als Warteraum und Wartebildschirm      | 7           | Akzeptiert                               | umgesetzt |
| ADR-037 | Anfragebox mit Anfrage vor der Antwort              | 8           | Akzeptiert                               | umgesetzt |
| ADR-038 | Ausblick: Antwort durch den Gegner                  | 8           | Vorgeschlagen                            | geplant   |

---

## ADR-001 Anwendungsfälle in Klartext vor dem API-Vertrag

### Kontext

Das Skript T4-14 beginnt mit den Fragen, wer die Anwendung nutzt und welche Anwendungsfälle es gibt. Das Projekt arbeitet contract-first. Der Vertrag braucht eine fachliche Grundlage.

### Entscheidung

Das Projekt beschreibt Nutzungssituationen zuerst in normalen Sätzen in `Irrgarten_Klartext.md`. Ein Szenario nennt, wer handelt, was es auslöst, wie es abläuft und was im Fehlerfall passiert. Aus den Szenarien entstehen Endpunkte, Fehlerfälle und Testfälle.

### Begründung

- Offene Fragen fallen vor dem Code auf, zum Beispiel was beim Verlassen eines Matches passiert.
- Die Szenarien liefern Testfälle und belegen, dass jede Anforderung einen Zweck hat.
- Kurze Szenarien von fünf bis zehn Zeilen vermeiden Dokumentation um ihrer selbst willen.

### Konsequenzen

- Die Klartext-Datei ist die Referenz für `openapi.yaml`.
- Eine Entscheidung ändert zuerst die Klartext-Datei und danach den Vertrag.

---

## ADR-002 Server als Schiedsrichter

### Kontext

Im Brettspiel trennt eine Sichtscheibe die Labyrinthe, und der Gegner beantwortet jede Anfrage ehrlich. Online gibt es keine Aufsicht am Tisch. Die Vorgabe verlangt, dass der Server fachlich begründet ist.

### Entscheidung

Der Server kennt beide Labyrinthe. Er beantwortet jede Anfrage selbst, erkennt den Sieg und lost den Startspieler aus. Der Gegner sieht Anfragen und Antworten live auf seinem Spielfeld. Das Spiel zeichnet den Weg des Fragenden in das Labyrinth des Gegners ein. Der Client erfährt das Labyrinth des Gegners erst nach Spielende.

### Begründung

- Verworfen wurde die Variante, in der die Spieler Anfragen selbst beantworten und der Server nur weiterleitet. Ein Gegner kann falsch antworten oder sich bei 6x6 Feldern verklicken. Prüft der Server die Antwort, kennt er sie bereits und der Klick bleibt überflüssig.
- Eine manuelle Antwort braucht einen anwesenden Gegner. Ein langsamer Gegner hält das Match an, und im Turnier warten alle anderen mit.
- Der Computer-Gegner kann keine Anfragen beantworten. Der Server muss ihn ohnehin bedienen. Ein manueller Weg ergibt einen zweiten Weg.
- Gewinnerkennung und Verhalten des Computers gehören laut Anforderungen ins Backend.
- Die Spannung im Brettspiel entsteht beim Warten auf das "Nein". Die Live-Anzeige erhält sie.

### Konsequenzen

- Eine Antwortlogik gilt für Menschen und Computer.
- Das Frontend enthält keine Spiellogik und speichert nur die bekannte Karte.
- Der Server gibt Daten des Gegners nie vor Spielende heraus.

---

## ADR-003 Koordinaten und Mauermodell

### Kontext

Das Brettfeld hat 6x6 Zellen. Der Vertrag und die Serverlogik brauchen eine einheitliche Schreibweise.

### Entscheidung

- Die Zeilen heißen A bis F von oben nach unten, die Spalten 1 bis 6 von links nach rechts. A1 liegt links oben, F6 rechts unten.
- Jedes Match startet auf A1. Das ersetzt den Eintritt über eine beliebige Zelle der ersten Spalte.
- Zellen heißen `C4`, Mauern heißen `A1_A2`. Interne Indizes wie `0-0` entfallen.
- Wie das Programm Mauern intern speichert und prüft, legt ADR-021 fest.

### Begründung

- Von Hand gepflegte ID-Listen erzeugen Fehler. Koordinatenbasierte IDs verringern die Randfälle.
- Ein fester Startpunkt vereinfacht Lösbarkeitsprüfung, Schatzplatzierung und Computer-Gegner.
- Die Planung sah eine Klasse `Mauer` mit Wandmarkierungen in den Zellen und einer Setzfunktion `setMauer()` vor. Die Umsetzung kommt ohne Klassen aus (siehe ADR-021).

### Konsequenzen

- API, Server und Client nutzen dieselbe Notation.
- Typen und Funktionen tragen deutsche Namen (`Zelle`, `Mauer`, `parseMauer`, `erreichbareZellen`).
- `shared/types.ts` bildet die Notation als Typen `Zelle` und `Mauer` ab.

---

## ADR-004 Labyrinth-Generierung und Schwierigkeit

### Kontext

Gegen den Computer braucht das Spiel ein Labyrinth, das der Server erzeugt. Mit der Schwierigkeit soll sich der Spielspaß einstellen lassen.

### Entscheidung

- Der Server erzeugt das Labyrinth mit einem Spannbaum-Algorithmus (zufällige Tiefensuche). Danach entfernt er je nach Schwierigkeit zusätzliche Wände (Braiding).
- `einfach` entfernt etwa 40 bis 60 Prozent, `standard` etwa 15 bis 25 Prozent, `schwer` entfernt keine.
- Die Schwierigkeit wirkt nur auf Labyrinthe des Computers, nie auf Spiele zwischen Menschen.
- Die Schwierigkeit misst der Server an der Länge des kürzesten Wegs, an der Zahl der Abbiegungen und an der Zahl der Sackgassen.

### Begründung

- Der Spannbaum garantiert die Lösbarkeit. Eine zusätzliche Prüfung beim Generieren entfällt.
- Braiding erzeugt Schleifen und verringert Sackgassen. Ein hoher Wert macht das Labyrinth leichter.
- Pfadmetriken sagen mehr über die Schwierigkeit aus als die Position des Schatzes allein.

### Konsequenzen

- Der BFS-Prüfer dient beim Generieren als Testwerkzeug. Für Labyrinthe von Spielern nutzt der Server ihn produktiv (siehe ADR-007).

---

## ADR-005 Anfragen entlang von Zeile oder Spalte

### Kontext

Im Brettspiel nennt der Spieler Feld für Feld. Bei jedem "Ja" fragt er weiter, ein "Nein" beendet den Zug. Online kostet jede Einzelanfrage Zeit.

### Entscheidung

Eine Anfrage nennt ein Zielfeld in derselben Zeile oder Spalte wie die Position, ein Feld oder mehrere Felder entfernt. Der Server antwortet so.

- `ja` setzt den Spieler auf das Ziel. Er fragt weiter und wählt die Richtung frei, zum Beispiel A1 nach A4 und danach A4 nach C4.
- `nurBis` setzt den Spieler vor die Mauer auf der Strecke. Der Server trägt die Mauer in die bekannte Karte ein, und der Zug endet.
- `nein` heißt, dass die Mauer direkt vor dem ersten Feld liegt. Die Position bleibt, die Mauer erscheint in der Karte, der Zug endet.
- `schatzGefunden` beendet das Match mit dem Sieg des Fragenden, auch wenn das Ziel hinter dem Schatz lag.

Diagonale Ziele und die eigene Position lehnt der Server mit 400 ab. Die Figur bleibt zwischen den Zügen stehen. Der Server zählt Anfragen.

### Begründung

- Mehrere Felder in einer Anfrage sparen Zeit und ändern den Spielablauf nicht.
- Bei `nurBis` lernt der Fragende die Mauer auf der Strecke ohne Zusatzanfrage.
- Ein Zug umfasst mehrere Anfragen. Wer nur Züge zählt, misst ungenau.
- Verworfen wurden Einzelfeld-Anfragen, weil sie das Spiel verlangsamen.

### Konsequenzen

- Die Mindestzahl an Anfragen entspricht den Geradenstücken des besten Wegs. Der Server berechnet sie mit einer Breitensuche über Geradenstücke (`minAnfragen`).
- Die Schwierigkeitsmetrik der Abbiegungen hängt eng damit zusammen.
- Begriffe bleiben getrennt. Die Anfrage ist ein einzelner Aufruf, der Zug umfasst alle Anfragen eines Spielers am Stück.

---

## ADR-006 Aufbauphase unter Kontrolle des Servers

### Kontext

Jeder Spieler baut sein Labyrinth in einer begrenzten Zeit. Uhren im Browser gehen falsch, und Hintergrund-Tabs bremsen Timer.

### Entscheidung

- Der Aufbau dauert drei Minuten. Er beginnt mit dem Beitritt des Gegners, gegen den Computer mit der Anlage des Matches.
- Der Server gibt die Zeit vor (`serverZeit`, `aufbauEndeAm`). Der Client berechnet daraus die Restzeit und zählt nicht selbst.
- Der Client speichert den Entwurf nach jeder Änderung auf dem Server. "Irrgarten setzen" meldet ihn fertig und sperrt ihn.
- Ein Spieler darf höchstens 30 Mauern setzen, wie im Brettspiel. Der Schatz liegt nie auf A1.
- Am Fristende setzt der Server offene Labyrinthe selbst. Fehlt der Schatz, wählt er zufällig eine von A1 erreichbare Zelle außer A1.
- Der Server lost den Startspieler zufällig aus.

### Begründung

- Die Serverzeit schützt vor falschen Uhren und gedrosselten Tabs.
- Ein Entwurf auf dem Server übersteht das Neuladen der Seite. Der Server kann bei Fristende selbst setzen, auch wenn der Client fehlt.
- Der Server bleibt die letzte Instanz für gültige Labyrinthe.

### Konsequenzen

- Der Vertrag trennt Entwurf speichern und Labyrinth setzen.
- Im Computer-Match setzt der Computer sofort. Niemand wartet auf einen Gegner.
- Entwürfe leben im Speicher des Servers. Ein Neustart beendet laufende Matches.

---

## ADR-007 Lösbarkeitsprüfung mit Nachbesserung

### Kontext

Ein Spieler kann sich mit seinen Mauern selbst vom Schatz abschneiden. Ein unlösbares Labyrinth macht das Spiel unspielbar.

### Entscheidung

- Sobald der Schatz liegt, prüft der Server nach jeder Änderung per Breitensuche von A1, ob der Schatz erreichbar ist. Der Spieler sieht "Schatz erreichbar" oder "Schatz nicht erreichbar".
- Bei einem Problem markiert das Spiel die Mauern am Rand des von A1 erreichbaren Bereichs. Diese Mauern heißen `problematischeMauern`. Öffnet der Spieler eine davon, wächst der Bereich.
- Solange der Schatz nicht erreichbar ist, bleibt "Irrgarten setzen" gesperrt. Der Server lehnt ein unlösbares Setzen zusätzlich mit 422 ab.
- Endet die Aufbauzeit mit unlösbarem Labyrinth, bekommt der Spieler eine weitere Minute. Der Gegner sieht nur "Gegner überarbeitet seinen Irrgarten", keine Details.
- Jeder Spieler bekommt höchstens eine Nachbesserung. Danach öffnet der Server zufällig eine markierte Mauer, bis der Schatz erreichbar ist, und setzt das Labyrinth.

### Begründung

- Die Live-Prüfung zeigt das Problem sofort und spart die Wartezeit am Ende.
- Eine Nachbesserung ist für den Spieler fairer als eine harte Ablehnung.
- Die Grenze von einer Nachbesserung verhindert eine Endlosschleife, in der der Gegner wartet.
- Es genügt, den Rand des erreichbaren Bereichs zu markieren. Die Mauern direkt zwischen Start- und Schatzbereich reichen nicht, weil dazwischen weitere abgeschlossene Bereiche liegen können.
- Der Name `problematischeMauern` ersetzt den ursprünglichen Begriff "Randmauern". Randmauern ließen sich mit den Außenwänden des Spielfelds verwechseln. Die Außenwände gelten implizit und stehen nie in der Liste.

### Konsequenzen

- Die Breitensuche steht als zentrale Funktion im Server. Aus dem Testwerkzeug wird Produktivcode mit eigenen Tests.
- `server/spiellogik/erreichbarkeit.ts` stellt `erreichbareZellen` und `problematischeMauern` bereit.
- `problematischeMauern` liefert immer die Mauern am Rand des erreichbaren Bereichs. Ob das Labyrinth lösbar ist und die Liste leer bleibt, entscheidet die Regelprüfung.
- Der Fehler 422 `LABYRINTH_UNLOESBAR` liefert die Liste im Feld `problematischeMauern` (siehe ADR-018).
- Der Gegner erfährt nichts über das Labyrinth, nur den Status.

---

## ADR-008 Bereitschaftsprüfung und Abwesenheit

### Kontext

Zwischen Aufbau und Spielstart kann ein Spieler den Bildschirm verlassen haben. Der Server braucht einen Weg, Anwesenheit zu prüfen.

### Entscheidung

- Stehen beide Labyrinthe, erscheint das Overlay "Bist du bereit zu spielen?" mit dem Button "Spiel starten". Die Frist beträgt 30 Sekunden.
- Klicken beide, beginnt das Spiel. Klickt nur ein Spieler, gewinnt er. Klickt keiner, bricht der Server das Match ohne Ergebnis ab.
- Im Spiel verliert, wer im eigenen Zug 60 Sekunden keine Anfrage stellt. Wer 15 Sekunden nicht abruft, verliert ebenfalls. Aufgeben zählt als Niederlage.
- Ein Match lässt sich nicht pausieren. Wer es verlässt, verliert.

### Begründung

- Das Overlay prüft die Anwesenheit mit einem Klick und braucht keinen Zusatzdienst.
- Die Planung sah eine Minute vor. 30 Sekunden reichen für einen Klick und lassen den anwesenden Spieler kürzer warten. Klartext und Vertrag nutzen diesen Wert.
- Der anwesende Spieler gewinnt, damit der Abwesende ihn nicht um das Spiel bringt.
- Ein Abbruch ohne Ergebnis für beide Spieler trifft auch den, der da war. Er gilt deshalb nur für den Fall, in dem keiner klickt.
- Ohne Pausieren bleibt der Zustand auf dem Server klein und das Spiel live.

### Konsequenzen

- Das Match kennt die Status `startbereit` und `abgebrochen`.
- Ein abgebrochenes Match erzeugt kein Ergebnis.

---

## ADR-009 Spielcode für das Duell

### Kontext

Die Anwendung ist neu und hat anfangs wenige Nutzer, die sich meist kennen. Zwei Spieler müssen sich für ein Duell finden.

### Entscheidung

- Wer ein Duell erstellt, erhält einen Spielcode und landet im Warteraum. Der Gegner wählt "Spiel beitreten" und gibt den Code ein.
- Der Code hat fünf Zeichen ohne `0`, `O`, `1` und `I`. Er verfällt nach zehn Minuten ohne Beitritt.
- Duell und Turnier haben getrennte Wege und eigene Codes. Der Code des anderen Modus liefert eine Fehlermeldung.

### Begründung

- Verworfen wurde eine offene Warteschlange. Sie braucht zwei Fremde gleichzeitig online. Bei wenigen Nutzern wartet ein Spieler lange ohne Gegner.
- Verworfen wurde die Einladung per Benutzername. Sie braucht Nutzersuche, Einladungsliste, Annehmen, Ablehnen und Fristen.
- Verworfen wurde ein gemeinsames Eingabefeld für beide Codes. Der Client muss die Art des Codes vorab abfragen, oder der Endpunkt führt je nach Code verschiedene Aktionen aus. Zwei Wege halten den Vertrag ressourcenorientiert und für den Spieler klar.
- Der Ersteller kennt seinen Gegner und gibt den Code direkt weiter.

### Konsequenzen

- Eine Lobby mit offenen Matches entfällt.
- Der Vertrag hat je einen Beitrittsendpunkt für Match und Competition.

---

## ADR-010 Turnier mit Host, Warteraum und Computer-Auffüllung

### Kontext

Ein Turnier braucht vier Teilnehmer. Kleine Freundesgruppen erreichen diese Zahl nicht immer. Das Turnier ist Pflichtbestandteil der Abgabe.

### Entscheidung

- Jeder Spieler kann ein Turnier anlegen und ist der Host. Er erhält einen Turnier-Code.
- Die Teilnehmer treten über den Code bei und sehen im Warteraum Namen und Anzahl.
- Der Host startet ab drei Spielern. Fehlt der vierte, ergänzt der Server einen Computer-Spieler. Es spielt höchstens ein Computer mit.
- Der Host stellt beim Anlegen die Schwierigkeit für den Computer-Irrgarten ein, den Wert liefert das Dashboard.
- Der Turnier-Code verfällt nach 30 Minuten ohne Start. Verlässt der Host den Warteraum, endet das Turnier. Verlässt ein Teilnehmer den Warteraum, entfernt der Server ihn.
- Das Turnier hat vier Spieler. Das Datenmodell trägt später acht, weil die Größe ein Feld ist und die Runden eine Liste bilden.

### Begründung

- Mit höchstens einem Computer entsteht nie ein Match Computer gegen Computer. Der Server muss kein Spiel ohne Menschen entscheiden.
- Der Computer im Turnier nutzt die Logik des Computer-Matches. Der Aufwand bleibt klein.
- Verworfen wurde das Auffüllen ab zwei Spielern, denn zwei Freunde spielen besser ein Duell.
- Verworfen wurde das Turnier mit acht Spielern. Es bringt sieben statt drei Matches, drei Runden und Computer gegen Computer. Das sprengt den Umfang.

### Konsequenzen

- Der Vertrag enthält Host, Warteraum und einen Startendpunkt, den nur der Host aufruft.
- Die Erweiterung auf acht Spieler bleibt offen (siehe Offene Punkte).

---

## ADR-011 Turnierablauf, Ausstieg und Abbruch

### Kontext

Jedes Turniermatch braucht einen Sieger. Spieler können aussteigen oder fehlen.

### Entscheidung

- Runde 1 lost zwei Paarungen aus. Der Computer spielt gegen einen Menschen.
- In Runde 2 spielen die Gewinner um Platz 1 und 2, die Verlierer um Platz 3 und 4. Der Server legt Runde 2 an, sobald beide Matches der Runde 1 enden.
- Jedes Match hat einen eigenen Aufbau und zählt als eigenes Spiel. Wer früher fertig ist, sieht einen Wartebildschirm.
- Wer ein Match verlässt oder per Frist verliert, verliert auch alle folgenden Matches. Der Gegner gewinnt kampflos.
- Erscheint in einem Match keiner der beiden Spieler, endet das Turnier ohne Wertung.

### Begründung

- Die Regel zum Verlassen entspricht der Regel jedes Matches (ADR-008) und braucht keinen Sonderfall.
- Der Abbruch ohne Ergebnis passt nicht zu einem Turnier, in dem jede Paarung einen Sieger braucht. Ein Turnier ohne Wertung schließt den seltenen Fall sauber ab.
- Ein neuer Aufbau pro Match hält jedes Match unabhängig und nutzt den bestehenden Ablauf.

### Konsequenzen

- Der Vertrag kennt den Endegrund `walkover` und den Turnierstatus `abgebrochen`.
- Das Turnier zeigt allen Spielern Paarungen, Stand und Platzierung.

---

## ADR-012 Aktualisierung per Polling

### Kontext

Zwei Spieler sehen denselben Stand fast in Echtzeit. Die Vorgabe lautet REST mit JSON und `fetch()` im Frontend.

### Entscheidung

- Der Client ruft den Matchstatus alle 1 bis 2 Sekunden ab und übergibt die letzte bekannte `version`. Bei gleichem Stand antwortet der Server mit 304.
- Der Server prüft Fristen bei jedem Abruf und führt fällige Aktionen aus, zum Beispiel das automatische Setzen. Er braucht keinen eigenen Timer.
- Das Turnier und der Warteraum nutzen dasselbe Muster.

### Begründung

- Polling passt zur Vorgabe REST und braucht weder WebSockets noch eigene Verbindungsverwaltung.
- Ein Abruf erfüllt mehrere Zwecke gleichzeitig. Er liefert den Stand, die Live-Anfragen des Gegners und gilt als Lebenszeichen.

### Konsequenzen

- Die Antwort enthält die Uhrzeit des Servers und alle Fristfelder.
- Die Last wächst mit der Zahl der Spieler. Bei dieser Anwendungsgröße spielt das keine Rolle.

---

## ADR-013 Kein Gastmodus

### Kontext

Ein Gast spielt ohne Konto gegen den Computer. Die Ergebnisse bleiben nur im Speicher der laufenden Seite.

### Entscheidung

Die Anwendung bietet keinen Gastmodus. Wer spielen will, registriert sich oder meldet sich an.

### Begründung

- Die Mindestanforderungen verlangen einfache Registrierung, Login und Highscore pro Nutzer. Ein Gastmodus kommt darin nicht vor.
- Ein Gastmodus kostet etwa einen halben Tag und erzeugt zusätzliche Fehlerfälle und Testfälle.
- Die Bewertung zählt Funktionalität, API-Design und Dokumentation. Dort zahlt sich der Aufwand besser aus.

### Konsequenzen

- Jeder Endpunkt außer Registrierung und Login verlangt eine Session.
- Die Überlegungen zum Gastmodus stehen in der Reflexion als bewusste Erweiterung. Dazu gehören eine Sitzungskennung per Cookie, die Sperre von Duell und Turnier mit 403 und das Verwerfen der Ergebnisse bei der Registrierung.

---

## ADR-014 Ergebnisse vom Server, Statistik statt Rangliste

### Kontext

Die Anforderungen verlangen Sieg und Niederlage pro Nutzer und eine Übersicht der letzten Ergebnisse mit Schwierigkeit und Datum.

### Entscheidung

- Jedes beendete Match mit Wertung erzeugt einen Eintrag, auch im Turnier. Der Eintrag nennt Gegner, Ausgang, Endegrund, Zahl der Anfragen, Datum und gegebenenfalls Turnier und Runde.
- Der Server legt Einträge selbst an. Es gibt keinen Endpunkt, mit dem der Client ein Ergebnis einträgt.
- Abgebrochene Matches und der Computer-Spieler im Turnier haben keinen Eintrag.
- Das Dashboard zeigt Siege, Niederlagen, Quote und die letzten zehn Spiele. Ein eigener Endpunkt liefert die Statistik. Die vollständige Liste öffnet der Button "Ergebnisse".
- Eine Rangliste über alle Nutzer entfällt.

### Begründung

- Wenn der Client Ergebnisse schreibt, schickt sich jeder Spieler Siege. Der Server verliert seine Rolle als Schiedsrichter.
- Die Anforderungen nennen keine Rangliste. Der Zähler und die Liste genügen.
- Die Zahl der Anfragen kostet nichts und hält die Punktevergabe offen.

### Konsequenzen

- Die Dokumentation begründet kurz, warum der Vertrag nur Lese-Endpunkte für Ergebnisse enthält.
- Eine spätere Rangliste zählt nur Siege gegen Menschen. Sonst füllt der leichte Computer sie.

---

## ADR-015 Dashboard, Schwierigkeit und Einstellungen

### Kontext

Die Anforderungen verlangen ein Dashboard mit Schwierigkeitseinstellung, einen sichtbaren Logout und eine Übersicht der letzten Ergebnisse.

### Entscheidung

- Die Schwierigkeit steht im Dashboard als Dropdown mit "Einfach", "Standard" und "Schwer". "Standard" ist vorgewählt. Sie bestimmt nur die Labyrinthe des Computers, auch im Turnier.
- Der Button "Abmelden" sitzt im Dashboard.
- Eine Einstellungsseite entfällt. Die zweite Schwierigkeitseinstellung für den Computer-Gegner entfällt ebenfalls.
- Nutzername und Passwort ändern gelten als spätere Erweiterung.

### Begründung

- Die Anforderungen nennen die Schwierigkeit im Dashboard. Zwei Orte für denselben Wert erzeugen Widersprüche.
- Namen und Passwort zu ändern fordert niemand und kostet Endpunkte und Prüfungen.

### Konsequenzen

- Das Frontend schickt die Schwierigkeit beim Anlegen eines Computer-Matches oder Turniers mit.
- Der Vertrag nutzt die Werte `einfach`, `standard` und `schwer`, mit `standard` als Vorgabe. Sie entsprechen den Anzeigenamen Einfach, Standard und Schwer. Eine Übersetzung zwischen Anzeige und Vertrag entfällt.

---

## ADR-016 Technologie-Stack

### Kontext

Die Vorgabe verlangt einen Server mit REST und JSON und ein Frontend, das per `fetch()` zugreift. Server und Client teilen Typen und sollen ohne großen Einrichtungsaufwand testbar sein.

### Entscheidung

- Der Server läuft auf **Deno** mit dem Web-Framework **Hono** (`server/`).
- Der Client nutzt **Vue 3** mit **Vite**, **Vue Router**, **Tailwind CSS 4** und **Vitest** (`client/`).
- Beide Seiten nutzen TypeScript.
- Der Server startete zunächst mit einer eigenen Handler-Funktion für `Deno.serve`. Commit `d180fb7` stellte ihn auf Hono um.

### Begründung

- Der Dozent der Vorlesung gibt den Stack vor.
- Deno führt TypeScript direkt aus und bringt Testrunner (`deno test`) und Formatierer (`deno fmt`) mit. Ein Build-Schritt und zusätzliche Werkzeuge entfallen.
- Eine eigene Handler-Funktion braucht für jede Route eine `if`-Abfrage auf den Pfad. Hono liefert Routing, einen Basispfad (`basePath('/api')`), Middleware wie `logger()` und zentrale Fehlerbehandlung (`onError`, `notFound`).
- Hono beantwortet Anfragen in Tests mit `app.request()` ohne offenen Port.
- Das Vue-Setup mit Vite liefert Router, Vitest, ESLint und TypeScript in einem Schritt.
- Tailwind 4 erzeugt aus `@theme` eigene Klassen wie `font-titel`. Die Designvorgaben aus `design.md` landen so an einer Stelle.

### Konsequenzen

- Server und Client haben getrennte Werkzeuge. Der Server nutzt `deno test` und `deno fmt`, der Client `npm`, Vitest und Prettier. ADR-017 und ADR-020 verbinden beide Seiten.
- Neue Routen entstehen als Hono-Handler. Fachlogik liegt getrennt davon in `server/spiellogik/` (siehe ADR-021).

---

## ADR-017 Gemeinsame Typen im Ordner shared

### Kontext

Server und Client tauschen Zellen, Mauern, Labyrinthe, Match-Status und Fehler aus. Getrennte Typdefinitionen laufen mit der Zeit auseinander. Ein Tippfehler wie `'laueft'` statt `'laeuft'` fällt dann erst zur Laufzeit auf.

### Entscheidung

- Alle Typen für den Datenaustausch liegen in `shared/types.ts`.
- Der Server importiert `../shared/types.ts`. Der Client importiert `@shared/types.ts` mit `import type`.
- Der Alias `@shared` steht in `client/vite.config.ts` und in `client/tsconfig.app.json`.
- Die Datei nutzt nur `type` und kein `interface`.
- Zellen und Mauern sind Template Literal Types (Typen aus Textmustern), `Zelle` als `${Zeile}${Spalte}` und `Mauer` als `${Zelle}_${Zelle}`.
- `MatchStatus` und `FehlerCode` übernehmen exakt die Werte aus `openapi.yaml`. Der Vertrag bleibt die Quelle der Wahrheit.

### Begründung

- Eine Typdatei für beide Seiten hält Server und Client synchron. TypeScript erkennt ungültige Werte wie `'G7'` schon beim Kompilieren.
- `import type` holt nur Typen. Im gebauten JavaScript bleibt davon nichts übrig, der Client lädt keinen Server-Code.
- Verworfen wurde das doppelte Pflegen der Typen. Die Kopien weichen unbemerkt voneinander ab.
- Verworfen wurde das Generieren der Typen aus `openapi.yaml`. Das Werkzeug lohnt sich bei der Projektgröße nicht und erzeugt schwer lesbaren Code.
- Verworfen wurde `interface`. Union Types wie `MatchStatus` gehen nur mit `type`. Eine Schreibweise für alles ist einfacher.

### Konsequenzen

- Der Typ `Mauer` prüft keine Nachbarschaft. TypeScript akzeptiert `'A1_F6'`. Die Prüfung zur Laufzeit regelt ADR-021.
- `shared/` enthält keinen Code mit Abhängigkeiten zu Deno oder Vue. Sonst bricht eine der beiden Seiten.
- Eine Änderung an der API betrifft `openapi.yaml` und `shared/types.ts`. Beide gehören in denselben Commit.
- Der Alias `@shared` steht an zwei Stellen. Vite braucht ihn zum Bauen, TypeScript zum Prüfen.

---

## ADR-018 Einheitliches Fehlerformat im Server

### Kontext

Der Client zeigt Fehlermeldungen an und reagiert auf bestimmte Fälle, etwa ein unlösbares Labyrinth mit markierten Mauern. Dafür braucht er bei jedem Fehler dieselbe Struktur. Unerwartete Fehler dürfen keine Interna wie Stacktraces oder Dateipfade preisgeben.

### Entscheidung

- Jeder Fehler hat die Form `{ fehler: { code, nachricht, details?, problematischeMauern? } }`.
- Handler werfen einen `ApiFehler` (`server/fehler.ts`) mit HTTP-Status, Code und Nachricht.
- `app.onError(fehlerBehandeln)` wandelt jeden Fehler zentral in dieses Format um.
- Unbekannte Fehler ergeben Status 500 mit Code `INTERN` und einer allgemeinen Nachricht. Die Details landen nur im Server-Log. Commit `ef403ad` ergänzte `INTERN` in `openapi.yaml`.
- `app.notFound` liefert für unbekannte Routen Code `NICHT_GEFUNDEN` im selben Format.
- `logger()` von Hono protokolliert jede Anfrage.

### Begründung

- Der Client wertet Fehler an genau einer Stelle aus.
- Ein Handler wirft nur und baut keine Antwort. Das hält die Handler kurz.
- Verworfen wurde eine eigene Fehlerantwort in jedem Handler. Das Format weicht schnell ab, und jeder Handler wiederholt dieselben Zeilen.
- Verworfen wurden die Standardantworten von Hono. Sie liefern Text statt JSON und keinen maschinenlesbaren Code.
- Verworfen wurde RFC 9457 (Problem Details). Der Standard passt nicht zum Format, das `openapi.yaml` bereits beschreibt.

### Konsequenzen

- Ein neuer Fehlercode erfordert Änderungen in `openapi.yaml` und `shared/types.ts`.
- `FehlerStatus` erlaubt nur 400, 401, 403, 404, 409, 422 und 500. Ein neuer Status muss dort ergänzt werden.
- Tests prüfen das Format mit einer eigenen `testApp` in `server/fehler_test.ts`. `main.ts` bleibt frei von Testrouten.
- Reine Funktionen der Spiellogik werfen keinen `ApiFehler` (siehe ADR-021).

---

## ADR-019 API-Modul im Client mit Netzwerkfehler

### Kontext

Viele Komponenten im Client rufen den Server auf. Ohne gemeinsames Modul wiederholt jede Komponente `fetch`, JSON-Auswertung und Fehlerprüfung. Außerdem muss der Client zwei Fälle unterscheiden. Der Server lehnt eine Anfrage fachlich ab, oder der Server antwortet gar nicht.

### Entscheidung

- `client/src/api.ts` stellt `get`, `post` und `put` bereit. Alle rufen `/api` plus Pfad auf.
- Bei Erfolg liefern die Funktionen die Daten, bei Status 204 `undefined`.
- Für das Polling gibt es `abfragen`. Bei Status 304 liefert die Funktion `null` für "nichts geändert".
- Bei Fehlern werfen sie einen eigenen `ApiFehler` mit Status, Code, Nachricht und dem vollständigen Fehlerobjekt des Servers.
- Der Client ergänzt den Code `NETZWERK`. Er gilt, wenn `fetch` scheitert oder der Vite-Proxy 502 bis 504 ohne das Fehlerformat meldet.
- Fehlt bei anderen Fehlern das Fehlerformat, gilt Code `INTERN`.

### Begründung

- Komponenten prüfen nur `fehler.code` und zeigen `fehler.message` an.
- Ein nicht gestarteter Server erscheint als `NETZWERK` und nicht als unklarer Fachfehler.
- Verworfen wurden axios und ky. Das Projekt braucht drei Methoden, `fetch` reicht ohne zusätzliche Abhängigkeit.
- Verworfen wurde der `ApiFehler` des Servers. Er hängt an Hono und kennt keinen Netzwerkfehler.

### Konsequenzen

- Antworten castet das Modul ungeprüft auf den erwarteten Typ. Weicht der Server ab, fällt das erst zur Laufzeit auf.
- Für DELETE oder weitere Methoden muss das Modul wachsen.
- Die erste Fassung behandelte die Antwort 304 aus ADR-012 als Fehler `INTERN`. Jeder unveränderte Abruf beim Polling wäre damit als Fehler erschienen. Seit der Ergänzung liefert `api()` bei 304 `null`, und `abfragen(pfad, since)` hängt `since` an und liefert den Typ `T | null`. Polling-Code prüft deshalb auf `null` und nicht auf einen Fehler.

---

## ADR-020 Vite-Proxy statt CORS

### Kontext

In der Entwicklung läuft der Client auf dem Vite-Server (Port 5173) und der Server auf Port 8000. Für den Browser sind das zwei verschiedene Origins (Herkunft aus Protokoll, Host und Port). Ohne weitere Maßnahmen blockiert der Browser die Anfragen. Phase 2 nutzt außerdem Session-Cookies, die bei fremden Origins zusätzliche Einstellungen brauchen.

### Entscheidung

- `client/vite.config.ts` leitet alle Anfragen an `/api` an `http://localhost:8000` weiter.
- Der Client nutzt nur relative Pfade wie `/api/health`.
- Der Server nutzt den Basispfad `/api` (`new Hono().basePath('/api')`).

### Begründung

- Der Browser sieht nur eine Origin. Cookies funktionieren ohne Zusatzeinstellungen.
- Verworfen wurde CORS im Server. Cookies erfordern dann `credentials: 'include'`, passende `SameSite`-Werte und eine genaue Liste erlaubter Origins. Das bringt Aufwand und Fehlerquellen.
- Verworfen wurden absolute URLs im Client. Sie binden den Code an eine feste Adresse und lösen das Origin-Problem nicht.

### Konsequenzen

- Der Proxy existiert nur im Vite-Entwicklungsserver. Für den Betrieb liefert der Server den gebauten Client selbst aus, oder ein Reverse Proxy übernimmt diese Rolle.
- Läuft der Server nicht, antwortet der Proxy mit 502 bis 504. Das API-Modul behandelt diesen Fall (siehe ADR-019).

---

## ADR-021 Mauern als normierte Strings und reine Funktionen

### Kontext

ADR-003 legt die Notation `A1_A2` fest und plante eine Klasse `Mauer` mit Wandmarkierungen in den Zellen. Beim Umsetzen der Spiellogik in Phase 1 zeigten sich zwei Fragen. Dieselbe Mauer lässt sich als `A1_A2` und als `A2_A1` schreiben. Und der Typ `Mauer` lässt Mauern zwischen Zellen zu, die nicht nebeneinander liegen, etwa `A1_F6`.

### Entscheidung

- Eine Mauer bleibt ein String vom Typ `Mauer`. Ein Labyrinth speichert seine Mauern als Liste `Mauer[]`. Klassen und Wandmarkierungen in Zellen entfallen.
- `A1_A2` und `A2_A1` sind dieselbe Mauer. `parseMauer` und `mauerZwischen` setzen die kleinere Zelle nach vorn. Jede Mauer hat damit genau eine Schreibweise.
- `parseMauer` prüft das Format und die Nachbarschaft. Ungültige Mauern wie `A1_F6` ergeben `null`.
- Die Spiellogik liegt als reine Funktionen in `server/spiellogik/`. Reine Funktionen hängen nur von ihren Eingaben ab und ändern nichts außerhalb. Beispiele sind `istZelle`, `sindNachbarn`, `parseMauer`, `nachbarn` und `erreichbareZellen`.
- Reine Funktionen werfen keine Fehler. Sie liefern `null` oder `false`. Erst die Routen wandeln das in einen `ApiFehler` mit Code `VALIDIERUNG` um.

### Begründung

- Eine einzige Schreibweise pro Mauer macht Vergleiche, Duplikatprüfung und das Zählen der 30 Mauern einfach. `includes` und `Set` funktionieren ohne Sonderfälle.
- Strings lassen sich direkt als JSON senden. Eine Klasse bräuchte Umwandlungen in beide Richtungen.
- Verworfen wurde die Klasse `Mauer` mit `setMauer()` aus ADR-003. Wandmarkierungen in Zellen sind ein zweiter Speicherort für dieselbe Information. Reine Funktionen berechnen Nachbarn und Erreichbarkeit bei Bedarf aus der Liste. Bei 36 Zellen kostet das keine messbare Zeit.
- Reine Funktionen lassen sich ohne Server und ohne Mocks testen. Jeder Test braucht nur Eingabe und erwartete Ausgabe.
- Die Spiellogik kennt dadurch kein HTTP. Dieselbe Funktion dient später dem Computer-Gegner und der Generierung (ADR-004).

### Konsequenzen

- Jede Mauer aus einer Anfrage läuft durch `parseMauer`, bevor die Spiellogik sie nutzt.
- Die Routen entscheiden über Status und Fehlercode. Die Spiellogik bleibt frei von `ApiFehler`.
- Die Tests in `server/spiellogik/*_test.ts` decken Randfälle wie die Spielfeldkanten und vertauschte Zellen ab.

---

## ADR-022 Passwort-Hash mit PBKDF2

### Kontext

Der Server speichert die Nutzer in `server/data/nutzer.json`. Passwörter dürfen dort nicht im Klartext stehen. Gerät die Datei in falsche Hände, wären sonst alle Konten offen. Viele Menschen nutzen ihr Passwort außerdem bei anderen Diensten.

### Entscheidung

- Der Server hasht Passwörter mit PBKDF2 und SHA-256 über die Web Crypto API (`crypto.subtle`), die Deno mitbringt.
- PBKDF2 wiederholt den Hash 600.000-mal. Jeder Nutzer erhält ein eigenes Salt aus 16 zufälligen Bytes.
- Gespeichert wird ein Text im Format `iterationen:salt:hash`, Salt und Hash in Hex.
- `passwortPruefen` vergleicht die Hashes in konstanter Zeit.
- `passwortHashen` und `passwortPruefen` liegen in `server/auth/passwort.ts`. Ein kaputter gespeicherter Text ergibt `false`, keinen Fehler.

### Begründung

- Web Crypto gehört zu Deno. Das Projekt braucht kein zusätzliches Paket.
- 600.000 Wiederholungen entsprechen der Empfehlung von OWASP für PBKDF2 mit SHA-256. Ein Angreifer kann dadurch nur wenige Passwörter pro Sekunde durchprobieren.
- Das Salt macht vorberechnete Tabellen nutzlos. Zwei Nutzer mit demselben Passwort haben verschiedene Hashes.
- Die Iterationen stehen im gespeicherten Text. Ein höherer Wert gilt dann für neue Hashes, alte bleiben prüfbar.
- Ein Vergleich, der beim ersten Unterschied abbricht, verrät über die Laufzeit, wie viele Bytes stimmen. Der Vergleich in konstanter Zeit schließt das aus.
- Verworfen wurde ein einfacher SHA-256-Hash. Er ist absichtlich schnell und erlaubt Milliarden Versuche pro Sekunde.
- Verworfen wurden bcrypt und Argon2. Beide brauchen in Deno ein zusätzliches Paket. Argon2 gilt als stärkste Wahl, PBKDF2 reicht für das Projekt aber aus.

### Konsequenzen

- Ein Hash dauert etwa 130 ms. Login und Registrierung sind dadurch spürbar, aber nicht störend langsam.
- Die Registrierung prüft den Namen vor dem Hashen. Ein vergebener Name kostet so keine Rechenzeit.
- Tests mit Passwörtern laufen langsamer als die Tests der Spiellogik.

---

## ADR-023 Sessions im Speicher und Nutzer in JSON-Datei

### Kontext

Der Vertrag in `openapi.yaml` verlangt eine Session über das Cookie `sid` mit `HttpOnly`. Jeder Endpunkt außer Registrierung und Login verlangt eine Session (ADR-013). Der Umsetzungsplan sieht für die Nutzer JSON-Dateien in `server/data/` vor. Offen war, wo die Sessions liegen und wie der Server Datei und Anfragen sicher zusammenbringt.

### Entscheidung

- **Nutzer:** Die Klasse `NutzerSpeicher` lädt `server/data/nutzer.json` beim Start in den Speicher. Jede Änderung schreibt die ganze Liste zurück. Die Schreibvorgänge laufen nacheinander über eine Promise-Kette und zuerst in eine temporäre Datei, die danach die alte ersetzt.
- **Sessions:** Die Klasse `Sessions` hält eine `Map` von Session-Id zu Nutzer-Id im Speicher. Die Session-Id entsteht mit `crypto.randomUUID()`. Sessions haben keine Ablaufzeit.
- **Cookie:** `sid` mit `HttpOnly`, `SameSite=Lax` und `Path=/api`.
- **Middleware:** `anmeldungPruefen` liest das Cookie, sucht Session und Nutzer und legt nur Id und Name in `c.var.nutzer` ab. Ohne gültige Session antwortet sie mit 401 `NICHT_ANGEMELDET`.
- **Namen:** Der Server entfernt Leerzeichen am Rand. Groß- und Kleinschreibung zählen beim Vergleich nicht. `Nudl` und `nudl` sind derselbe Name.
- **Login:** Unbekannter Name und falsches Passwort ergeben dieselbe Meldung "Name oder Passwort falsch.".
- Ein neuer Login im selben Browser beendet die alte Session.
- `main.ts` baut die App über `appErstellen(sessions, speicher)`. Tests geben einen Speicher in einem Temp-Ordner hinein.

### Begründung

- Eine JSON-Datei reicht für wenige Nutzer und braucht keine Datenbank. Alle Nutzer im Speicher machen jede Suche sofort möglich.
- Ohne die Promise-Kette überschneiden sich zwei gleichzeitige Schreibvorgänge. Ohne die temporäre Datei hinterlässt ein Absturz beim Schreiben eine halbe, ungültige Datei, und alle Nutzer sind verloren.
- `HttpOnly` hält die Session-Id von Skripten im Browser fern. `SameSite=Lax` verhindert, dass fremde Seiten Aktionen im Namen des Nutzers auslösen (CSRF).
- Nur Id und Name in `c.var.nutzer` verhindern, dass ein Handler den Passwort-Hash versehentlich zurückschickt.
- Dieselbe Login-Meldung verrät nicht, ob ein Name existiert.
- Verworfen wurden Sessions in einer Datei. Nach einem Neustart neu anzumelden ist für das Projekt zumutbar und spart Schreibzugriffe bei jedem Login.
- Verworfen wurden JSON Web Tokens. Ein Logout ist damit nur über zusätzliche Sperrlisten möglich, und bei einem einzigen Server bringen sie keinen Vorteil.

### Konsequenzen

- Nach einem Neustart des Servers muss sich jeder neu anmelden.
- Sessions enden nur durch Logout, neuen Login im selben Browser oder Neustart.
- Das Cookie hat kein `Secure`, weil die Entwicklung über `http://localhost` läuft. Für einen Betrieb über HTTPS gehört es dazu.
- Die gleiche Login-Meldung schützt nur teilweise. Die Registrierung meldet einen vergebenen Namen mit 409, und ein Login mit bekanntem Namen dauert wegen des Hashens länger.
- Der Server begrenzt fehlgeschlagene Login-Versuche nicht.
- Der Server braucht Leserechte und Schreibrechte für den Ordner `data` (`--allow-write=data`). Die Tests laufen über `deno task test`.

---

## ADR-024 Anmeldezustand im Client und geschützte Routen

### Kontext

Der Client muss wissen, wer angemeldet ist. Startseite, Kopfzeile und Router brauchen diese Information gleichzeitig. Nach dem Neuladen der Seite ist der Speicher des Clients leer, das Cookie gilt aber weiter. Seiten wie das Dashboard sollen ohne Anmeldung nicht erscheinen.

### Entscheidung

- `client/src/anmeldung.ts` hält den Nutzer in einem `ref` auf Modulebene. Die Funktionen `anmelden`, `registrieren`, `abmelden` und `pruefen` ändern diesen Wert.
- `anmelden` und `registrieren` reichen den `ApiFehler` unverändert weiter. Das Formular zeigt Feldfehler am Feld und alle anderen Fehler als Meldung.
- `abmelden` wertet 401 als Erfolg, weil die Session dann schon beendet ist.
- Ein Router-Guard fragt beim ersten Seitenwechsel einmal `/auth/me`. Ist der Server nicht erreichbar, fragt er beim nächsten Wechsel erneut.
- Jede Route ist geschützt. Nur Routen mit `meta: { oeffentlich: true }` sind ohne Anmeldung erreichbar, aktuell nur die Startseite. Angemeldete Nutzer leitet der Guard von der Startseite zum Dashboard.
- Das Formular prüft Namen und Passwort vorab mit `NAME_LAENGE` und `PASSWORT_LAENGE` aus `shared/types.ts`. Die Wiederholung des Passworts prüft nur der Client.

### Begründung

- Ein `ref` auf Modulebene existiert genau einmal. Alle Komponenten sehen denselben Wert, und Vue zeichnet sie bei Änderungen neu.
- Verworfen wurde Pinia. Die Bibliothek müsste installiert werden, und für einen einzigen Wert lohnt sich das nicht.
- Verworfen wurde "offen als Standard" mit einer Markierung für geschützte Routen. Eine vergessene Markierung ließe eine Seite unbemerkt offen. Eine vergessene Markierung bei "geschützt als Standard" fällt dagegen sofort auf.
- Gleiche Grenzen in Server und Client verhindern, dass das Formular Eingaben durchlässt, die der Server ablehnt.
- Der Guard dient dem Komfort. Die Sicherheit liegt beim Server, der jede Anfrage ohne Session mit 401 beantwortet.

### Konsequenzen

- Neue Seiten in späteren Phasen sind ohne zusätzliche Angabe geschützt.
- Eine weitere öffentliche Seite braucht `meta: { oeffentlich: true }`.
- `routerErstellen(history)` baut den Router. Tests erzeugen damit für jeden Fall einen frischen Router im Speicher.
- Wächst der gemeinsame Zustand in späteren Phasen deutlich, lohnt sich ein Wechsel zu Pinia.

---

## ADR-025 Schatzplatzierung nach Schwierigkeit des Wegs

### Kontext

ADR-004 legt fest, wie der Server das Labyrinth des Computers erzeugt. Die Schwierigkeit soll er an der Länge des kürzesten Wegs, an der Zahl der Abbiegungen und an der Zahl der Sackgassen messen. Offen blieb, wie diese Maße die Lage des Schatzes bestimmen.

Die erste Umsetzung loste den Schatz bei `schwer` aus den Zellen mit dem längsten Weg von A1. Eine Anfrage läuft aber eine ganze Zeile oder Spalte entlang. Ein gerader Gang über fünf Felder kostet eine Anfrage, ein Zickzack über fünf Felder kostet fünf. Die Weglänge allein sagt deshalb wenig darüber, wie schwer der Schatz zu finden ist.

### Entscheidung

- Der Server bestimmt für jede erreichbare Zelle einen kürzesten Weg von A1 per Breitensuche.
- Er bewertet jeden Weg mit drei Maßen:
  - **Abbiegungen**: Richtungswechsel auf dem Weg. Wer das Labyrinth kennt, braucht mindestens Abbiegungen plus eine Anfrage.
  - **Abzweigungen**: offene Durchgänge am Weg, die nicht zum Ziel führen. Jede Abzweigung ist eine Gelegenheit, sich zu verlaufen.
  - **Weglänge**: Schritte auf dem Weg.
- Die Wertung einer Zelle ist die Summe aus Abbiegungen und Abzweigungen. Bei gleicher Wertung gilt die Zelle mit dem längeren Weg als schwerer.
- Der Server sortiert die Zellen nach dieser Wertung und lost den Schatz bei `einfach` aus allen Zellen außer A1, bei `standard` aus der schwereren Hälfte und bei `schwer` aus dem schwersten Fünftel.

### Begründung

- Abbiegungen bilden die Spielmechanik ab, denn sie bestimmen die Mindestzahl der Anfragen.
- Abzweigungen erfassen Irrwege. Eine Zelle direkt neben A1 kann damit schwer sein, wenn der Weg dorthin über viele Sackgassen führt.
- Die Weglänge bleibt als Entscheider bei Gleichstand. Als dritter Summand würde sie lange gerade Gänge überbewerten.
- Ein Los aus einem Anteil statt der einen schwersten Zelle hält das Spiel abwechslungsreich.
- Verworfen wurde die reine Weglänge. Sie bewertet gerade Gänge als schwer, obwohl eine Anfrage reicht.
- Verworfen wurde die Luftlinie von A1. Sie ignoriert die Mauern vollständig.
- Verworfen wurde vorerst eine Simulation, bei der der Computer-Sucher jedes Labyrinth mehrfach spielt. Sie hängt vom Sucher ab und kostet bei jedem neuen Match Rechenzeit.

### Konsequenzen

- `server/spiellogik/wegbewertung.ts` enthält `kuerzesteWege`, `wegBewerten` und `schwererZuerst`. Der Computer-Sucher kann diese Funktionen später nutzen.
- Bei Labyrinthen mit Schleifen gibt es mehrere kürzeste Wege. Die Breitensuche wählt einen davon, die Wertung kann für einen anderen Weg leicht abweichen.
- Sobald der Computer-Sucher eine Strategie hat, prüft ein Test, ob er bei `schwer` im Schnitt mehr Anfragen braucht als bei `einfach`. Damit wäre die Abstufung belegt.
- Die Anteile 100, 50 und 20 Prozent sind Startwerte. Spieltests können sie verändern.

---

## ADR-026 Match-Schicht im Speicher mit eigener Ansicht

### Kontext

Phase 3 bringt die ersten Matches gegen den Computer. Die Funktionen in `server/spiellogik/` sind rein. Sie melden ungültige Eingaben mit `null` oder `false` (ADR-021). Ein Match braucht aber mehr: Spieler, Zustand, Zugrecht, Zähler und Fehlermeldungen nach dem Vertrag. Beide Labyrinthe liegen auf dem Server. Der Client darf das Labyrinth des Gegners erst nach Spielende sehen (ADR-002). Offen war, wo diese Logik liegt, wer die Fehler wirft und wo die Matches gespeichert sind.

### Entscheidung

- Der Ordner `server/match/` enthält die Match-Schicht in vier Dateien:
  - `typen.ts` mit `MatchIntern` und `SpielerDaten`. Beide Typen verlassen den Server nie.
  - `ablauf.ts` mit Erstellen, Entwurf speichern, Labyrinth setzen und Anfrage stellen.
  - `ansicht.ts` mit `ansichtFuer(match, nutzerId, jetzt)`, die den Typ `Match` aus `shared/types.ts` für einen Spieler baut.
  - `speicher.ts` mit der Klasse `MatchSpeicher` (`anlegen`, `holen`, `offenesMatchVon`).
- **Fehler:** Die Match-Schicht wirft `ApiFehler` mit Status und Code aus dem Vertrag selbst. `spiellogik/` bleibt bei Rückgaben mit `null` oder `false`.
- **Speicher:** Matches liegen nur in einer `Map` im Arbeitsspeicher, Schlüssel ist die Match-Id.
- **Zustand:** `MatchIntern` speichert nur Fakten. Abgeleitete Werte wie `pruefung`, `serverZeit` und die Sicht `ich` und `gegner` berechnet `ansichtFuer` bei jeder Antwort. Zeiten sind intern `Date` und nach außen ISO-Text.
- **Änderungen:** Die Funktionen in `ablauf.ts` ändern das Match direkt und erhöhen bei jeder Änderung `version`. Der Speicher hält dasselbe Objekt und braucht keine Methode zum Aktualisieren.
- **Ansicht:** `ansichtFuer` schreibt jedes Feld einzeln. Kopien ganzer interner Objekte mit `...` sind verboten. Das Labyrinth des Gegners erscheint erst im Status `beendet`.
- **Prüfreihenfolge:** Zuerst Teilnahme (403), dann Form der Eingabe (400), dann Zustand und Zugrecht (409), zuletzt der Inhalt (400 oder 422).
- Zeit und Zufall kommen als Parameter `jetzt` und `zufall` in die Funktionen. Der Computer hat die feste Id `computer`.
- In Phase 3 führt das Setzen beider Labyrinthe direkt zum Status `laeuft`. Die Bereitschaftsprüfung nach ADR-008 folgt in Phase 4.

### Begründung

- Die Spiellogik kennt weder HTTP noch Statuscodes. Sie bleibt einfach testbar und lässt sich im Computer-Sucher wiederverwenden.
- Die Match-Schicht kennt den Zusammenhang einer Anfrage. Nur sie weiß, ob ein `null` aus `anfrageAuswerten` 400 `ZIEL_NICHT_GERADE` bedeutet. Würden erst die Routen die Fehler erzeugen, stünden die Spielregeln verteilt in zwei Schichten.
- Nur Fakten im internen Zustand verhindern Widersprüche. Ein gespeichertes Feld `pruefung` kann veralten, ein berechnetes nicht.
- Einzeln geschriebene Felder mit dem Rückgabetyp `Match` lassen TypeScript jedes fehlende oder falsche Feld melden. Ein vergessenes geheimes Feld rutscht dadurch nicht in die Antwort.
- Die erste Prüfung auf Teilnahme verrät Fremden nichts über den Zustand eines Matches.
- Ein Match dauert wenige Minuten. Geht es bei einem Neustart verloren, ist der Schaden gering. Die Sessions liegen aus demselben Grund im Speicher (ADR-023).
- Verworfen wurde eine Datei pro Match. Jede Anfrage würde schreiben, und das Polling nach ADR-012 käme hinzu.
- Verworfen wurden unveränderliche Matches, bei denen jede Funktion ein neues Objekt liefert. Jede Route müsste das Ergebnis zurück in den Speicher schreiben, und ein vergessener Schritt verlöre die Änderung still.

### Konsequenzen

- Ein Neustart des Servers beendet alle laufenden Matches ohne Ergebnis.
- Beendete Matches bleiben bis zum Neustart im Speicher. Ergebnisse dauerhaft zu speichern und alte Matches aufzuräumen folgt mit ADR-014.
- `offenesMatchVon` durchsucht alle Matches. Für die erwartete Zahl an Matches reicht das.
- Tests steuern Zeit und Zufall ohne Tricks. Ganze Partien laufen damit vorhersagbar.
- Ändern zwei Anfragen dasselbe Match fast gleichzeitig, schützt die `anfrageNr` vor doppelt gezählten Anfragen. Deno verarbeitet eine Anfrage ohne `await` dazwischen vollständig, bevor die nächste beginnt.
- Ein späterer Wechsel zu einer Datenbank betrifft nur `speicher.ts` und die Stellen, die nach einer Änderung speichern müssten.

---

## ADR-027 Offenes Match und Schwierigkeit im Account

### Kontext

Ein Nutzer darf höchstens ein offenes Match haben. Schließt er den Tab, kennt der Client die Id des Matches nicht mehr. Ein neues Match lehnt der Server mit 409 ab. Bis Phase 4 gibt es keine Fristen, das Match bleibt bis zum Neustart offen. Auch danach darf ein Spieler im Aufbau zurückkehren, solange die drei Minuten laufen.

Laut ADR-015 und Klartext ist "Standard" im Dashboard vorgewählt. Wer meist auf "Schwer" spielt, wählt nach jedem Neuladen neu.

### Entscheidung

- Neuer Endpunkt `GET /matches/current`. Er liefert das offene Match des Nutzers oder 404. Das Dashboard fragt ihn beim Laden und bietet "Fortsetzen" und "Aufgeben" an.
- Der Server merkt sich beim Nutzer die zuletzt gespielte Schwierigkeit. `POST /matches` im Modus `computer` speichert sie, `GET /auth/me` liefert sie im Feld `schwierigkeit`. Das Dashboard wählt diesen Wert vor.
- Neue Nutzer starten mit `standard`. Konten ohne das Feld erhalten beim Laden `standard`.
- `NutzerSpeicher.schwierigkeitMerken` schreibt die Datei nur, wenn sich der Wert ändert. Ein abgelehntes Match ändert die Schwierigkeit nicht.
- `alsNutzer` baut die Sicht des Clients auf einen Nutzer Feld für Feld. Middleware und Login nutzen diese Funktion.

### Begründung

- Nur der Server kennt das offene Match sicher. Eine Id im Speicher des Browsers geht auf einem anderen Gerät oder nach dem Löschen der Daten verloren.
- In Phase 4 ist `GET /matches/current` der Ort, an dem der Server abgelaufene Fristen nachträgt. Im Modus `computer` ruft nach dem Schließen des Tabs sonst niemand ab.
- Die Schwierigkeit gehört zum Nutzer und folgt ihm auf jedes Gerät.
- "Zuletzt gespielt" braucht keinen eigenen Endpunkt und keine Einstellungsseite. ADR-015 bleibt damit gültig.
- Verworfen wurde der `localStorage` für beide Werte. Er hängt an einem Browser.
- Verworfen wurde, die Auswahl im Dropdown sofort zu speichern. Jede Änderung ohne Spiel kostete einen Schreibzugriff, und ein bloßes Ausprobieren überschriebe die Vorgabe.

### Konsequenzen

- Der Typ `Nutzer` in `shared/types.ts` und das Schema `User` enthalten `schwierigkeit`.
- Die Route `/current` steht in Hono vor `/:id`. Sonst gälte "current" als Match-Id.
- Das Nachtragen der Fristen in `GET /matches/current` und vor der 409 in `POST /matches` folgt in Phase 4. Bis dahin gilt die Umsetzung als teilweise.
- Ändert der Nutzer das Dropdown ohne zu spielen, zeigt das Dashboard nach dem Neuladen wieder die zuletzt gespielte Schwierigkeit.

---

## ADR-028 Fristen ohne Timer bei jedem Zugriff

### Kontext

Ein Match hat fünf Fristen (ADR-006 bis ADR-008). Der Aufbau dauert drei Minuten, die Nachbesserung eine Minute, die Bereitschaft 30 Sekunden, ein Zug 60 Sekunden. Ohne Abruf gilt ein Spieler nach 15 Sekunden als abwesend. ADR-012 legt fest, dass der Server Fristen bei jedem Abruf prüft und keinen eigenen Timer braucht. Offen war, wie das genau abläuft. Im Modus `computer` ruft nach dem Schließen des Tabs niemand mehr ab. Ohne Prüfung sperrt ein verlassenes Match den Nutzer mit 409 (ADR-027). In Phase 3 führte das Setzen direkt zu `laeuft` (ADR-026). Der Status `startbereit` fehlte.

### Entscheidung

- `fristenPruefen(match, jetzt, zufall)` in `server/match/fristpruefung.ts` trägt alle abgelaufenen Fristen nach. Sie prüft in der Reihenfolge des Spielablaufs: Aufbau, dann Bereitschaft, dann Spiel. Jede Prüfung kann den Status für die nächste ändern.
- Jede Folge zählt ab dem Fristende, nicht ab dem Abruf. Kehrt ein Spieler nach zehn Minuten zurück, läuft die ganze Kette in einem Aufruf ab.
- Im Spiel zählt der früheste Verstoß. Zugfrist und Abruffrist stehen als Kandidaten nebeneinander, der mit dem früheren Ende entscheidet.
- **Aufbauende:** Jeder Spieler ohne "Irrgarten setzen" wird gesetzt. Fehlt der Schatz, legt der Server ihn sofort. Liegt der Schatz unerreichbar, beginnt die Nachbesserung. Nach ihr öffnet der Server zufällig markierte Mauern (`labyrinthVervollstaendigen` in `server/spiellogik/automatik.ts`).
- **Bereitschaft:** Nach dem Setzen aller Labyrinthe folgt `startbereit`. Die Startfrist zählt ab dem Zeitpunkt, an dem das letzte Labyrinth stand. Der Computer ist sofort bereit. `POST /matches/{id}/ready` bestätigt, und erst danach lost der Server den Startspieler aus.
- **Spiel:** Das Feld `zugEndeAm` im Vertrag nennt das Ende der Zugfrist. Jede Anfrage startet sie neu. Die Abruffrist gilt nur im Status `laeuft` und beginnt mit dem Spielstart.
- **Routen:** Jede Route unter `/matches/{id}` holt ihr Match über `matchHolen`. Die Funktion prüft erst die Teilnahme, dann die Fristen, dann speichert sie das Lebenszeichen (`abrufMerken`). `GET /matches/current` und `POST /matches` tragen die Fristen über `offenesMatch` vor der Antwort nach.
- Ein Lebenszeichen erhöht `version` nicht. `GET /matches/current` zählt nicht als Lebenszeichen.

### Begründung

- Die Prüfung beim Zugriff braucht keinen Hintergrunddienst. Tests steuern sie mit einer festen Uhr und brauchen keine vorgetäuschten Timer.
- Ein Ende ab dem Fristende macht das Ergebnis unabhängig davon, wann jemand abruft. Eine Rückkehr nach zehn Minuten liefert dasselbe Ergebnis wie ein Abruf nach 16 Sekunden.
- Die Reihenfolge Teilnahme, Fristen, Lebenszeichen hat zwei Gründe. Fremde lösen keine Fristen aus. Eine Rückkehr tilgt keine abgelaufene Abruffrist.
- Ohne `version`-Erhöhung antwortet das Polling weiter mit 304.
- Das Dashboard schaut nur nach. Wer dort ist, sitzt nicht im Spiel.
- Ein fehlender Schatz hat kein Problem, das der Spieler nachbessern kann. Der Klartext sieht dafür das sofortige Legen vor.
- Verworfen wurde ein `setTimeout` pro Match. Ein Neustart verliert die Timer. Jede Aktion muss dann Timer anlegen und löschen, und Tests brauchen vorgetäuschte Uhren.
- Verworfen wurde, Folgen ab dem Abruf zu zählen. Das Ergebnis hängt dann vom Zufall des nächsten Abrufs ab.

### Konsequenzen

- Ein Match ohne jeden Zugriff bleibt im Speicher im alten Status. Das ist ohne Folgen, denn jeder Blick darauf trägt die Fristen zuerst nach.
- Ein neuer Endpunkt für ein Match nutzt `matchHolen` und ist damit automatisch geschützt.
- Der Status `abgebrochen` tritt auf, wenn keiner bereit ist. Im Modus `computer` kommt das nicht vor, die Logik gilt aber schon für das Duell.
- `beenden` bekommt den Zeitpunkt des Endes mit. Bei einer Frist ist das ihr Ende.

---

## ADR-029 Ergebnisse in einer JSON-Datei beim Spielende

### Kontext

ADR-014 legt fest, dass der Server Ergebnisse selbst anlegt. Offen waren der Speicherort, der Zeitpunkt des Eintrags und der Schutz vor doppelten Einträgen. Ein Match endet an vielen Stellen: Schatz gefunden, Aufgeben, Zugfrist, Abwesenheit oder Startfrist. Die Match-Schicht arbeitet ohne Dateizugriff (ADR-026).

### Entscheidung

- Die Klasse `ErgebnisSpeicher` in `server/ergebnis/speicher.ts` hält alle Ergebnisse und schreibt sie in `server/data/ergebnisse.json`.
- Das sichere Schreiben steht in der Klasse `JsonDatei` (`server/jsonDatei.ts`). `NutzerSpeicher` und `ErgebnisSpeicher` nutzen sie beide.
- `ergebnisseAus(match)` in `server/match/ergebnis.ts` baut einen Eintrag pro Mensch. Der Computer und abgebrochene Matches bekommen keinen.
- Die Routen rufen `ergebnisseSichern` nach dem Nachtragen der Fristen und vor jeder Antwort auf. `eintragen` erkennt ein schon eingetragenes Match am Paar aus Match-Id und Nutzer-Id und ändert dann nichts.
- `beendetAm` ist der Zeitpunkt des Spielendes. Bei einer Frist ist es deren Ende.
- Die Felder `minAnfragen` und `effizienz` aus dem Vertrag fehlen noch. Sie gehören zur offenen Punktevergabe.

### Begründung

- Eine JSON-Datei passt zu den Nutzern (ADR-023). Ergebnisse müssen einen Neustart überstehen, Matches nicht.
- Ein doppelt sicheres `eintragen` (idempotent) erlaubt viele Aufrufstellen. Kein Ende geht verloren, und kein Match zählt doppelt.
- Ein Eintrag gleich nach dem Nachtragen der Fristen sichert auch ein Ende, nach dem die Route mit 409 antwortet.
- Verworfen wurde der Eintrag direkt in `beenden`. Die Match-Schicht braucht dann Dateizugriff und `await`, und reine Tests der Spielabläufe schreiben Dateien.
- Verworfen wurde ein Merker "Ergebnis gespeichert" im Match. Er ist ein zweiter Zustand neben dem Speicher und kann von ihm abweichen.

### Konsequenzen

- `appErstellen` nimmt optional einen `ErgebnisSpeicher`. Ohne Angabe bleiben Ergebnisse nur im Arbeitsspeicher. Das genügt den meisten Tests.
- `aufgeben` bekommt die Uhrzeit als Parameter.
- Die Lese-Endpunkte `/results` und `/results/stats` und die Anzeige im Dashboard folgen in Phase 6. Bis dahin gilt ADR-014 als teilweise umgesetzt.
- Die Endansicht zeigt die Anfragen beider Spieler. Dafür hat das Schema `Spieler` das Feld `anfragen` bekommen.

---

## ADR-030 Zugfrist erst nach der Wiedergabe des Computerzugs

### Kontext

Der Computer spielt seinen ganzen Zug auf dem Server sofort. Der Client zeigt die Anfragen danach einzeln mit 0,7 Sekunden Pause. So sieht der Spieler den Weg des Computers live, wie es der Klartext verlangt. Mit den Fristen aus ADR-028 entstanden daraus zwei Fehler. Der Server startete die 60 Sekunden des Spielers vor der Wiedergabe. Ein Zug mit 20 Anfragen kostete 14 Sekunden Bedenkzeit. Außerdem rief der Client während der Wiedergabe nicht ab. Ab 22 Anfragen verlor der Spieler wegen Abwesenheit, obwohl er zusah.

### Entscheidung

- Die Pause steht als `WIEDERGABE_PAUSE_MS = 700` in `shared/types.ts`. Client und Server nutzen denselben Wert.
- Nach dem Zug des Computers setzt der Server `zugEndeAm` auf die Zeit nach der Wiedergabe plus 60 Sekunden. Die Wiedergabe dauert die Zahl der Computer-Anfragen mal 700 Millisekunden.
- Der Client ruft auch während der Wiedergabe ab. Die Wiedergabe beginnt erst nach dem Abschluss der eigenen Anfrage.

### Begründung

- Der Spieler bekommt seine vollen 60 Sekunden, und der Server bleibt allein für die Frist zuständig.
- Eine gemeinsame Konstante hält Client und Server gleich. Ändert sich die Pause, ändert sich die Frist mit.
- Verworfen wurde eine Meldung des Clients am Ende der Wiedergabe. Ein manipulierter Client verzögert sie beliebig und hält damit die Frist an.
- Verworfen wurde, den Computerzug ohne Wiedergabe sofort zu zeigen. Der Spieler sieht den Weg des Computers dann nicht mehr.
- Verworfen wurde eine kürzere Pause. Sie verkleinert das Problem, löst es aber nicht.

### Konsequenzen

- Die Beschreibung von `zugEndeAm` im Vertrag nennt die Verlängerung.
- Nach einem langen Computerzug zeigt der Countdown während der Wiedergabe mehr als 1:00. Am Ende der Wiedergabe steht er bei 1:00.
- Im Duell gibt es keine Wiedergabe. Die Regel gilt nur nach einem Zug des Computers.

---

## ADR-031 Live-Sicht über die Anfrageliste des Gegners

### Kontext

Der Klartext verlangt, dass der Gegner meine Anfragen und die Antworten live sieht. Bis Phase 4 kannte der Client vom Gegner nur seine Karte (`gegnerKarte`) mit Position, besuchten Zellen und entdeckten Mauern. Daraus lässt sich die Spur zeichnen, aber nicht jede Anfrage mit ihrer Antwort. Gegen den Computer löst die Wiedergabe das Problem (ADR-030). Im Duell gibt es keine Wiedergabe. Der Client erfährt den Zug des Gegners nur über das Polling alle 1,5 Sekunden. In dieser Zeit stellt der Gegner oft mehrere Anfragen.

### Entscheidung

- Der Server speichert pro Spieler die Liste aller Anfragen mit Antwort (`verlauf`). `anfrageEintragen` hängt jede Anfrage an, beim Menschen wie beim Computer.
- Das Match enthält das Feld `gegnerAnfragen` mit der ganzen Liste des Gegners, älteste zuerst. Im Status `wartet` ist es `null`.
- Der Client zeigt die Liste im Duell in einem eigenen Kasten über den Spielfeldern, neueste Anfrage oben. Der Kasten sieht aus wie das Bereitschafts-Overlay, dunkelt die Seite aber nicht ab.

### Begründung

- Die ganze Liste kommt mit jedem geänderten Stand. Der Client verpasst keine Anfrage, auch nicht nach dem Neuladen oder bei mehreren Anfragen zwischen zwei Abrufen.
- Die Liste verrät nichts Geheimes. Sie enthält nur Mauern, die der Gegner in meinem Labyrinth schon entdeckt hat.
- Verworfen wurde, die Anfragen aus der Änderung der `gegnerKarte` abzuleiten. Bei mehreren Anfragen zwischen zwei Abrufen fehlen Ziel und Antwort der mittleren.
- Verworfen wurde ein eigener Endpunkt nur für neue Anfragen. Er braucht einen zweiten Abruf pro Takt und eine eigene Zählung, was der Client schon kennt.
- Verworfen wurde, nur die Spur zu zeigen. Sie erfüllt den Klartext nur halb.

### Konsequenzen

- Der Vertrag hat das Feld `gegnerAnfragen` bekommen.
- Die Antwort wächst mit jeder Anfrage. Bei höchstens einigen Dutzend Anfragen pro Spiel spielt das keine Rolle.
- Gegen den Computer liefert der Server das Feld auch. Der Client zeigt dort weiter die Wiedergabe und keinen Kasten.

---

## ADR-032 Warteraum als Status der Spielansicht

### Kontext

Nach "Spiel erstellen" wartet der Ersteller, bis sein Freund mit dem Code beitritt (ADR-009). Der Klartext verlangt einen Warteraum mit Code und der Möglichkeit abzubrechen. Der Code verfällt nach zehn Minuten.

### Entscheidung

- Der Warteraum ist keine eigene Seite. Die Spielansicht `/spiel/:id` zeigt ihn im Status `wartet` statt der Spielfelder.
- Der Warteraum zeigt den Code, eine Anleitung für den Gegner und die Restzeit aus dem neuen Feld `codeEndeAm`. "Abbrechen" ruft `POST /matches/{id}/resign` auf. Im Status `wartet` bricht der Server das Match ohne Ergebnis ab.
- Den Ablauf des Codes prüft der Server bei jedem Zugriff wie alle anderen Fristen (ADR-028). Danach ist das Match `abgebrochen`.
- Im Warteraum gibt es keine Abruffrist. Schließt der Ersteller den Tab, verfällt der Code nach zehn Minuten.
- Der Server normiert den Code. Groß- und Kleinschreibung sowie Leerzeichen am Rand spielen keine Rolle.

### Begründung

- Das Polling der Spielansicht erkennt den Beitritt am Wechsel auf `aufbau`. Ein eigener Abruf für den Warteraum entfällt.
- "Fortsetzen" im Dashboard führt ohne Sonderfall zurück in den Warteraum.
- Verworfen wurde eine eigene Seite für den Warteraum. Sie braucht ein zweites Polling und einen Seitenwechsel beim Beitritt.
- Verworfen wurde eine Abruffrist im Warteraum. Ohne Gegner verliert niemand etwas, und die zehn Minuten räumen das Duell ohnehin ab.
- Der Countdown zeigt dem Ersteller, wie lange sein Freund noch Zeit hat.

### Konsequenzen

- Der Vertrag hat das Feld `codeEndeAm` bekommen.
- Ein wartendes Duell zählt als offenes Match. Der Ersteller startet kein zweites Spiel, bis er abbricht oder der Code verfällt.
- Ein abgebrochenes Match mit nur einem Spieler zeigt "Niemand ist beigetreten" statt "Keiner war rechtzeitig bereit".

---

## ADR-033 Ergebnisse seitenweise und nach dem offenen Match

### Kontext

Der Klartext verlangt im Dashboard Siege, Niederlagen, Quote und die letzten zehn Spiele. Der Button "Ergebnisse" öffnet die vollständige Liste. Der Vertrag bietet dafür `GET /results` mit `limit` und `offset` und `GET /results/stats`. Die Liste wächst mit jedem Spiel. Der Server prüft Fristen nur bei einem Zugriff auf das Match (ADR-028). Ein Match, das durch Zeitablauf endete, hat erst nach diesem Zugriff ein Ergebnis.

### Entscheidung

- Der Server liefert eine Seite der Ergebnisse, die neuesten zuerst. `limit` gilt von 1 bis 100 mit 10 als Vorgabe, `offset` ab 0. Andere Werte beantwortet er mit 400 `VALIDIERUNG`.
- Das Dashboard lädt die letzten 10 Spiele. Die Ergebnisseite `/ergebnisse` lädt 20 Einträge pro Klick auf "Mehr laden".
- Kommt eine Seite kürzer als angefragt zurück, ist die Liste zu Ende. Der Button verschwindet.
- Lädt die Ergebnisseite einen Eintrag doppelt, lässt der Client ihn weg. Das passiert, wenn zwischen zwei Seiten ein Spiel endet.
- Das Dashboard ruft zuerst `/matches/current` auf und danach Statistik und Liste. Nach "Aufgeben" lädt es alles neu.
- Die Details eines Spiels klappt das HTML-Element `<details>` auf.

### Begründung

- Seiten halten jede Antwort klein, egal wie viele Spiele jemand gespielt hat.
- Verworfen wurde die ganze Liste in einer Antwort. Sie wächst ohne Grenze.
- Verworfen wurden nummerierte Seiten. Dafür braucht die Antwort die Gesamtzahl der Einträge, und der Vertrag sieht sie nicht vor. "Mehr laden" kommt ohne sie aus.
- Der Abruf von `/matches/current` trägt abgelaufene Fristen nach. Danach steht das Ergebnis eines gerade beendeten Matches schon in der Statistik.
- Verworfen wurde eine Fristprüfung in `/results`. Die Ergebnis-Routen bräuchten dann den Match-Speicher und die Fristlogik.
- `<details>` klappt ohne eigenen Zustand in Vue auf und bedient sich mit der Tastatur.

### Konsequenzen

- Der Server hat eigene Routen in `server/ergebnis/routen.ts`. Sie lesen nur.
- Ruft jemand `/ergebnisse` direkt auf, ohne vorher das Dashboard zu öffnen, fehlt ein Match, das seit dem letzten Abruf durch Zeitablauf endete. Beim nächsten Besuch des Dashboards erscheint es.
- Endet zwischen zwei Seiten ein Spiel, erscheint es erst nach dem Neuladen der Seite. Doppelte Einträge entstehen nicht.

---

## ADR-034 Turnier als Hülle um normale Matches

### Kontext

Ein Turnier besteht aus drei bis vier Matches in zwei Runden (ADR-010, ADR-011). Jedes Match läuft wie ein Duell oder wie ein Spiel gegen den Computer. Aufbau, Fristen, Anfragen und Ergebnisse gibt es seit Phase 3 bis 5. Der Server hat keinen Timer (ADR-028). Ein Turnier muss trotzdem Runde 2 anlegen, sobald Runde 1 endet.

### Entscheidung

- Das Turnier lebt in `server/turnier/` mit eigenem `TurnierSpeicher` im Arbeitsspeicher, wie die Matches (ADR-026).
- Ein Turnier-Match ist ein normales Match mit `competitionId` und `runde`. Gegen den Computer entsteht es über `computerMatchErstellen`. Zwei Menschen spielen ein Duell, dem der Gegner sofort beitritt (`duellErstellen` und `beitreten`). Beide starten direkt im Aufbau.
- Eine Paarung speichert nur `matchId` und `platzUm`. Status, Sieger und Anfragen liest die Ansicht beim Abruf aus dem Match.
- Die Auslosung mischt alle Teilnehmer und paart Platz 1 mit 2 und Platz 3 mit 4.
- `turnierNachtragen` läuft bei jedem Abruf eines Turniers. Es prüft die Code-Frist von 30 Minuten, trägt die Fristen der Matches der aktuellen Runde nach und schreibt das Turnier fort. Ist Runde 1 beendet, entsteht Runde 2. Ist Runde 2 beendet, steht die Platzierung fest und landet in den Ergebnissen.
- Wer in einem offenen Match oder in einem wartenden oder laufenden Turnier steckt, startet nichts Neues. Der Server antwortet mit 409. Match- und Turnier-Routen teilen sich dafür den `Spielstand` in `server/turnier/nachtragen.ts`.
- Duell- und Turnier-Codes sind nie gleichzeitig vergeben. Der Code des anderen Modus liefert 404 (ADR-009).
- Der Vertrag erhält `GET /competitions/current` sowie `serverZeit` und `codeEndeAm` in der Competition.

### Begründung

- Ein Turnier-Match ohne eigenen Typ nutzt den ganzen Ablauf aus Phase 3 bis 5 unverändert. Fristen, Live-Sicht und Ergebnisse gelten ohne Sonderfall.
- Die Paarung speichert keine Kopie von Status und Sieger. So gibt es jede Information nur an einer Stelle.
- Verworfen wurde ein Timer, der Runde 2 anlegt. Er widerspricht ADR-028 und überlebt keinen Neustart.
- Verworfen wurde ein Turnier-Match mit eigenem Status `wartet`. Beide Spieler stehen fest, ein Code ist überflüssig.
- Die Sperre verhindert, dass ein Spieler parallel ein anderes Match spielt und sein Turnier-Match per Frist verliert.
- `/competitions/current` findet ein Turnier auch zwischen zwei Runden wieder. In dieser Zeit gibt es kein offenes Match.

### Konsequenzen

- Runde 2 entsteht erst beim nächsten Abruf der Turnierübersicht oder des Dashboards. Ihr Aufbau beginnt in diesem Moment.
- Die Ergebnisse enthalten Turnier und Runde sofort und den Endplatz nach Runde 2 (`ErgebnisSpeicher.platzierungEintragen`).
- Die Ansicht eines beendeten Matches zeigt das Labyrinth des Gegners nur, wenn er gesetzt hat. Wer im Aufbau aufgibt oder kampflos verliert, hat keins. Diese Prüfung behebt auch einen Fehler aus Phase 5.

---

## ADR-035 Ausscheiden, Walkover und Abbruch im Turnier

### Kontext

ADR-011 legt fest: Wer ein Match verlässt oder per Frist verliert, verliert auch alle folgenden Matches. Erscheint in einem Match keiner der beiden Spieler, endet das Turnier ohne Wertung. Offen blieb, welche Endegründe als Verlassen zählen und was passiert, wenn beide Spieler einer Paarung in Runde 2 schon ausgeschieden sind.

### Entscheidung

- Als ausgeschieden gilt, wer ein Match mit `aufgabe`, `abwesenheit`, `zugfrist`, `startfrist` oder `walkover` verliert. Eine Niederlage mit `schatz` zählt nicht.
- Das Match einer Paarung mit genau einem ausgeschiedenen Spieler entsteht trotzdem und endet sofort mit `walkover`. Der anwesende Spieler gewinnt.
- Sind beide Spieler einer Paarung in Runde 2 ausgeschieden, endet das Turnier ohne Wertung (`abgebrochen`).
- Endet ein Match einer Runde als `abgebrochen`, weil keiner bereit war, endet das Turnier ebenfalls ohne Wertung.
- Gespielte Matches behalten ihre Ergebnisse, auch wenn das Turnier danach abbricht.

### Begründung

- Die Aufzählung der Endegründe folgt dem Klartext: Verlassen, 60 Sekunden ohne Anfrage und fehlende Bereitschaft sind Fristverluste. Wer den Schatz nicht als Erster findet, ist dagegen anwesend.
- Ein angelegtes und sofort beendetes Match erscheint in der Übersicht als Paarung mit Sieger. Beide Spieler erhalten ein Ergebnis wie bei jedem Match.
- Zwei ausgeschiedene Spieler entsprechen dem Fall "keiner erscheint" aus ADR-011.
- Verworfen wurde, beide als Verlierer zu werten. Dann fehlen Platz 3 und 4, und eine unvollständige Platzierung ist schwer zu erklären.

### Konsequenzen

- Der Computer scheidet nie aus, weil er weder aufgibt noch Fristen versäumt.
- Ein kampfloses Match hat keine Anfragen. Sein Ergebnis zählt mit 0 Anfragen.

---

## ADR-036 Turnierseite als Warteraum und Wartebildschirm

### Kontext

Der Klartext verlangt einen Warteraum mit Namen und Anzahl, einen Startknopf nur für den Host, einen Wartebildschirm für den, der früher fertig ist, und eine Übersicht mit Paarungen, Stand und Platzierung. Spieler wechseln zwischen Turnier und Match hin und her.

### Entscheidung

- Eine Seite `/turnier/:id` zeigt im Status `wartet` den Warteraum und danach die Übersicht. Die Übersicht ist zugleich der Wartebildschirm.
- Die Seite ruft das Turnier alle 1,5 Sekunden ab, ohne `since`. Nach `beendet` oder `abgebrochen` hört sie auf.
- Meldet der Server `meinNaechstesMatchId`, wechselt die Seite sofort in dieses Match.
- Nach einem Turnier-Match führt die Spielansicht zur Turnierübersicht statt zum Dashboard. Das gilt auch nach dem Aufgeben.
- Nur der Host sieht Code und Countdown. Sein Knopf zum Verlassen heißt "Turnier auflösen".
- Das Dashboard zeigt bei offenem Turnier ohne offenes Match die Karte "Laufendes Turnier". Es lädt erst `/matches/current`, dann `/competitions/current`, dann die Statistik.

### Begründung

- Der automatische Wechsel bringt alle Spieler zum Start der Runde 2 ohne Klick ins Match. Die Aufbauzeit läuft ab dem Anlegen.
- Ohne `since` bleibt der Server einfach. Ein Turnier ist klein, und jeder Abruf soll ohnehin fortschreiben.
- Verworfen wurde ein Wartebildschirm in der Spielansicht. Er bräuchte dort das Turnier und eine zweite Abfrage.
- Die Reihenfolge der Abrufe im Dashboard folgt ADR-033. Erst nach dem Nachtragen stimmen Turnier und Statistik.

### Konsequenzen

- Wer nach Runde 1 auf der Endansicht seines Matches bleibt, bemerkt Runde 2 erst mit dem Klick auf "Zur Turnierübersicht". Die Aufbauzeit läuft in dieser Zeit schon.
- Der Vertrag hat für die Competition kein `version`. Ein späteres `since` für Turniere bleibt möglich.

---

## ADR-037 Anfragebox mit Anfrage vor der Antwort

### Kontext

Im ersten Durchlauf im Browser fielen zwei Schwächen auf. Anfragen waren kaum wahrnehmbar. Die Antwort kam fast gleichzeitig mit dem Klick, und die Figur sprang sofort weiter. Außerdem trennte der Text Anfrage und Antwort nicht klar. Der Verlauf zeigte Einträge wie "Computer: C3, Nur bis C2". Im Duell sah der Spieler die Anfragen des Gegners nur als Liste im Live-Kasten, auf dem Feld sprang die Figur alle 1,5 Sekunden.

### Entscheidung

- Im Status `laeuft` steht über den Spielfeldern eine Anfragebox an der Stelle der späteren Ergebnisbox. Sie zeigt zuerst nur die Anfrage, zum Beispiel "Computer fragt C3?". Das Zielfeld blinkt im betroffenen Irrgarten.
- Nach einer Pause erscheint die Antwort als farbiges Etikett: grün für Ja, gelb für Nur bis, rot für Nein, cyan für den Schatz. Erst dann zieht die Figur.
- Eine Anfrage steht `ANFRAGE_ANZEIGE_MS = 1500` allein in der Box. Die Antwort bleibt danach `ANTWORT_ANZEIGE_MS = 2100` stehen. Zusammen ergibt das `WIEDERGABE_PAUSE_MS = 3600`. Der Wert ersetzt die 700 Millisekunden aus ADR-030.
- Eigene Anfragen stehen 1,5 Sekunden allein in der Box, auch wenn der Server schneller antwortet. Wechselt danach der Zug, bleibt meine Antwort 2,1 Sekunden stehen, bevor der Gegner fragt. So bleibt auch "Nein" oder "Nur bis" lesbar.
- Nach dem Zug des Computers verlängert der Server die Zugfrist um eine Anfrage mehr als bisher: meine eigene Anfrage plus alle Anfragen des Computers, jeweils mal `WIEDERGABE_PAUSE_MS`. Ohne Computerzug verlängert er nichts.
- Im Duell spielt die Box neue Einträge aus `gegnerAnfragen` (ADR-031) genauso ab. Bringt ein Abruf mehrere Anfragen, reiht der Client sie in eine Warteschlange ein. Solange weitere warten, läuft die Wiedergabe dreimal so schnell. Die letzte Anfrage läuft im normalen Tempo.
- Die Ergebnisbox erscheint erst nach der letzten Anfrage der Wiedergabe.
- Die Anfrageliste unter den Spielfeldern entfällt. Die Box zeigt jede Anfrage, und im Duell listet der Live-Kasten die Anfragen des Gegners (ADR-031). Er schreibt Anfrage und Antwort getrennt: "C3? → Nur bis C2, dann eine Mauer".
- Wer die Auslosung gewonnen hat, steht bis zur ersten Anfrage in der Box. Bisher stand das in der Liste.

### Begründung

- Die Änderung betrifft nur die Anzeige. Server, Vertrag und Spielregeln bleiben gleich. Der Server antwortet weiter sofort und bleibt Schiedsrichter (ADR-002).
- Die feste Reihenfolge Anfrage, Antwort, Zug macht jede Anfrage sichtbar und zeigt, welche Antwort zu welcher Anfrage gehört.
- Die gemeinsame Konstante hält Client und Server gleich. Der Server verlängert die Zugfrist nach dem Computerzug automatisch um die längere Wiedergabe.
- Verworfen wurde, dass der Gegner jede Anfrage selbst beantwortet. Dieser Vorschlag steht als Ausblick in ADR-038.
- Verworfen wurde, nur die Pause aus ADR-030 zu verlängern. Ohne Box bleibt unklar, was Anfrage und was Antwort ist.
- Ein erster Entwurf mit 0,7 Sekunden für Anfrage und Antwort war im Browser zu schnell zum Lesen. Außerdem überschrieb die erste Anfrage des Computers sofort meine Antwort. Ein "Nein" war deshalb nie zu sehen. Ein zweiter Entwurf mit je 2,1 Sekunden ließ die Anfrage zu lange stehen. Die Anfrage ist kurz, die Antwort braucht mehr Lesezeit.
- Das schnellere Tempo bei Rückstand verhindert im Duell, dass die Wiedergabe dem Gegner davonläuft. Stellt der Gegner schnell viele Anfragen, holt die Box auf und zeigt die letzte wieder in Ruhe.

### Konsequenzen

- Ein Zug des Computers mit 20 Anfragen dauert in der Wiedergabe 72 statt 14 Sekunden. Das Spiel gegen den Computer wird spürbar langsamer.
- Im Duell verlängert der Server keine Frist. Endet der Zug des Gegners, läuft meine Bedenkzeit schon während der letzten Wiedergabe, meist knapp vier Sekunden.
- Bei "Ja" kostet die eigene Anfrage 1,5 Sekunden der eigenen Bedenkzeit. Jede Anfrage startet die 60 Sekunden aber neu.
- Server und Client brauchen nach einer Änderung der Konstante einen Neustart, sonst passt die Frist nicht zur Wiedergabe.

---

## ADR-038 Ausblick: Antwort durch den Gegner

### Kontext

Im Brettspiel beantwortet der Gegner jede Anfrage selbst. Diese Interaktion fehlt im Projekt. Der Server antwortet sofort, der Gegner schaut nur zu. Der Vorschlag kam nach der Umsetzung aller Phasen, einen Tag vor der Prüfung.

### Vorschlag

- Stellt A eine Anfrage, merkt sich der Server sie als offen und antwortet noch nicht.
- B sieht die Anfrage in der Anfragebox und wählt "Ja", "Nein" oder "Nur bis" mit dem letzten erreichbaren Feld.
- Der Server prüft die Antwort gegen das echte Labyrinth. Eine falsche Antwort lehnt er ab, B korrigiert. So schummelt niemand.
- Erst die geprüfte Antwort geht an A, dann startet bei beiden die Animation.
- Gegen den Computer beantwortet der Spieler die Anfragen des Computers. Der Computer beantwortet die Anfragen des Spielers sofort.

### Aufwand

| Bereich | Änderung                                                               |
| ------- | ---------------------------------------------------------------------- |
| Vertrag | Feld `offeneAnfrage` im Match, Endpunkt `POST /matches/{id}/answer`    |
| Server  | Anfrage parken, Antwort prüfen, Antwortfrist mit automatischer Antwort |
| Fristen | Wartezeit auf die Antwort zählt nicht zur Zugfrist, ADR-030 neu fassen |
| Client  | Knöpfe in der Anfragebox, Feldwahl für "Nur bis", Warteanzeige für A   |
| Turnier | erbt den Ablauf über die normalen Matches (ADR-034)                    |
| Doku    | neue ADR für ADR-002, Klartext, Spielanleitung, Vertrag                |

Der Umfang entspricht etwa Phase 5.

### Begründung für den Aufschub

- Der Umbau ändert den Kern des Spielablaufs. Kurz vor der Prüfung gefährdet er ein getestetes und dokumentiertes System.
- Weil der Server falsche Antworten ablehnt, gibt es immer genau eine gültige Antwort. Der Antwortende entscheidet nichts, er bestätigt. Der Gewinn liegt im Spielgefühl, nicht in der Spiellogik.
- Jede Anfrage wartet auf einen Menschen und auf das Polling. Gegen den Computer beantwortet der Spieler 15 bis 30 Anfragen pro Spiel. Das Spiel wird deutlich langsamer.
- ADR-037 löst die sichtbaren Schwächen ohne Änderung am Ablauf.

### Konsequenzen

- Für eine Umsetzung braucht es vorher drei Entscheidungen: die Länge der Antwortfrist, das Verhalten bei falscher Antwort (nur ablehnen oder als Fehler zählen) und ob der Modus pro Match wählbar ist.
- Ein wählbarer Modus "Antworten selbst geben" hält das schnelle Spiel gegen den Computer und bietet im Duell die Interaktion des Brettspiels.

---

## Offene Punkte und Erweiterungen

Diese Punkte sind bewusst nicht entschieden oder als Erweiterung zurückgestellt.

- Antwort durch den Gegner statt durch den Server (ADR-038).

- Punktevergabe nach Siegen oder nach Anfragen im Vergleich zum Minimum. Das Ergebnis speichert die Zahl der Anfragen bereits. `minAnfragen` und `effizienz` fehlen noch (ADR-029).
- Beendete Matches bleiben bis zum Neustart im Arbeitsspeicher. Ein Aufräumen alter Matches fehlt.
- Beendete Turniere bleiben wie Matches bis zum Neustart im Arbeitsspeicher. Ein Neustart beendet laufende Turniere.
- Runde 2 entsteht erst beim nächsten Abruf. Ein Hinweis in der Endansicht des Matches fehlt (ADR-036).
- Turnier mit acht Spielern. Die Mindestzahl für das Auffüllen mit Computern bleibt offen, und der Fall Computer gegen Computer braucht eine Regel.
- Gemeinsames Eingabefeld für Duell-Codes und Turnier-Codes.
- Zufälliger Live-Gegner über eine offene Warteschlange.
- Gastmodus nur gegen den Computer, mit Ergebnissen im Speicher der Seite.
- Nutzername und Passwort ändern.
- Rangliste über alle Spieler, gezählt nur mit Siegen gegen Menschen.
- Ablaufzeit für Sessions, `Secure` am Cookie für den Betrieb über HTTPS und eine Begrenzung fehlgeschlagener Login-Versuche (siehe ADR-023).
