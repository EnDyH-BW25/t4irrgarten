# Architecture Decision Records Irrgarten

Stand 12.11.2026. Das Format folgt dem Mini-ADR aus dem Skript mit Kontext, Entscheidung, Begründung und Konsequenzen.

Die Datei sammelt alle Entscheidungen des Projekts nach Thema. Eine akzeptierte ADR bleibt unverändert. Ändert sich eine Entscheidung, entsteht eine neue ADR. Die alte erhält den Status "Ersetzt durch ADR-0XX".

Die Übersicht trennt zwei Angaben.
- **Status** sagt, ob die Entscheidung gilt.
- **Umsetzung** sagt, ob der Code sie schon enthält. Die Werte sind umgesetzt, teilweise und geplant.

## Übersicht

| Nr      | Titel                                              | Phase    | Status     | Umsetzung |
| ------- | -------------------------------------------------- | -------- | ---------- | --------- |
| ADR-001 | Anwendungsfälle in Klartext vor dem API-Vertrag    | Planung  | Akzeptiert | umgesetzt |
| ADR-002 | Server als Schiedsrichter                          | Planung  | Akzeptiert | teilweise |
| ADR-003 | Koordinaten und Mauermodell                        | Planung  | Akzeptiert | teilweise |
| ADR-004 | Labyrinth-Generierung und Schwierigkeit            | Planung  | Akzeptiert | geplant   |
| ADR-005 | Anfragen entlang von Zeile oder Spalte             | Planung  | Akzeptiert | geplant   |
| ADR-006 | Aufbauphase unter Kontrolle des Servers            | Planung  | Akzeptiert | teilweise |
| ADR-007 | Lösbarkeitsprüfung mit Nachbesserung               | Planung  | Akzeptiert | teilweise |
| ADR-008 | Bereitschaftsprüfung und Abwesenheit               | Planung  | Akzeptiert | teilweise |
| ADR-009 | Spielcode für das Duell                            | Planung  | Akzeptiert | geplant   |
| ADR-010 | Turnier mit Host, Warteraum und Computer-Auffüllung | Planung | Akzeptiert | geplant   |
| ADR-011 | Turnierablauf, Ausstieg und Abbruch                | Planung  | Akzeptiert | geplant   |
| ADR-012 | Aktualisierung per Polling                         | Planung  | Akzeptiert | teilweise |
| ADR-013 | Kein Gastmodus                                     | Planung  | Akzeptiert | geplant   |
| ADR-014 | Ergebnisse vom Server, Statistik statt Rangliste   | Planung  | Akzeptiert | geplant   |
| ADR-015 | Dashboard, Schwierigkeit und Einstellungen         | Planung  | Akzeptiert | geplant   |
| ADR-016 | Technologie-Stack                                  | Einrichtung | Akzeptiert | umgesetzt |
| ADR-017 | Gemeinsame Typen im Ordner shared                  | 0        | Akzeptiert | umgesetzt |
| ADR-018 | Einheitliches Fehlerformat im Server               | 0        | Akzeptiert | umgesetzt |
| ADR-019 | API-Modul im Client mit Netzwerkfehler             | 0        | Akzeptiert | teilweise |
| ADR-020 | Vite-Proxy statt CORS                              | 0        | Akzeptiert | umgesetzt |
| ADR-021 | Mauern als normierte Strings und reine Funktionen  | 1        | Akzeptiert | umgesetzt |

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
- Das Modul behandelt die Antwort 304 aus ADR-012 noch als Fehler `INTERN`. Vor dem Polling in Phase 3 braucht es eine eigene Funktion, die bei 304 `null` liefert.

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

## Offene Punkte und Erweiterungen

Diese Punkte sind bewusst nicht entschieden oder als Erweiterung zurückgestellt.

- Punktevergabe nach Siegen oder nach Anfragen im Vergleich zum Minimum. Das Ergebnis speichert die nötigen Werte bereits.
- Turnier mit acht Spielern. Die Mindestzahl für das Auffüllen mit Computern bleibt offen, und der Fall Computer gegen Computer braucht eine Regel.
- Gemeinsames Eingabefeld für Duell-Codes und Turnier-Codes.
- Zufälliger Live-Gegner über eine offene Warteschlange.
- Gastmodus nur gegen den Computer, mit Ergebnissen im Speicher der Seite.
- Nutzername und Passwort ändern.
- Rangliste über alle Spieler, gezählt nur mit Siegen gegen Menschen.
