# Startbildschirm
Wenn ich die Anwendung starte, lande ich zunächst auf dem Startbildschirm. Hier logge ich mich ein oder registriere mich neu. 
Login und Registrierung bestehen aus Benutzername und Passwort. 
Bei der Registrierung gebe ich das Passwort zweimal ein. Beide Eingaben müssen übereinstimmen. 

# Dashboard
Nach Login oder Registrierung lande ich auf dem Dashboard. Von hier aus starte ich alle Aktionen über Buttons. 

1.  Schwierigkeitsgrad einstellen 
    => Im Dropdown "Schwierigkeit" wähle ich "Einfach", "Standard" oder "Schwer". "Standard" ist vorausgewählt. Die Schwierigkeit bestimmt den Irrgarten, den der Server für den Computer-Gegner erzeugt. Gegen einen Live-Gegner spielt sie keine Rolle. 

2.  Neues Spiel starten
    => Über den Button "Neues Spiel" wähle ich den Spielmodus "Live-Gegner" oder "Computer-Gegner". Bei "Live-Gegner" entscheide ich mich zwischen "Spiel erstellen" und "Spiel beitreten". Wenn ich ein Spiel erstelle, erhalte ich einen Spielcode und lande im Warteraum. Dort sehe ich den Code und kann das Spiel abbrechen. Der Code verfällt nach zehn Minuten ohne Beitritt. Mein Freund, mit dem ich spielen möchte, wählt "Spiel beitreten" und gibt den Code in das erscheinende Feld ein. Sobald er beitritt, beginnt für uns beide der Aufbau des Irrgartens. Bei "Computer-Gegner" beginnt der Aufbau sofort. 

3.  Neues Turnier starten
    => Über den Button "Neues Turnier" gelange ich zur Auswhal "Neues Turnier erstellen" oder "Turnier beitreten". Wenn ich ein Turnier erstelle, bin ich der Turnier-host. Ich erhalte einen Spielcode für meine Mitspieler. Wenn ich beitrete, gebe ich den Spielcode in das Feld ein, das nach dem Klick auf "Turnier beitreten" erscheint. Den weiteren Ablauf beschreibt der Abschnitt Turnier.

4.  Spielergebnisse einsehen
    => Das Dashboard zeigt meine Siege, Niederlagen und meine Quote. Darunter stehen meine letzten 10 Spiele. über den Button "Ergebnisse" öffne ich die vollständige Liste. Nähere Informationen stehen im Abschnitt Ergebnisse.

5.  Abmelden 
    => Der Button "Abmelden" beendet meine Sitzung und führt mich zum Startbildschirm zurück. 


# Spiel 
Wenn ich ein Spiel starte, wechsle ich zur Ansicht meines Spielbrettes. Hier sehe ich zwei unterschiedlich farbige Spielfelder mit einer Größe von jeweils 6x6 Kästchen. Diese sind vertikal mit den Buchstaben von A bis F und horizontal mit den Ziffern 1 bis 6 beschriftet. 

## Aufbau
Das blaue Spielfeld links gehört mir. Darauf baue ich mit orangefarbenen Spielsteinen mein Labyrinth. Ich setze eine Mauer mit einem Klick auf den Zwischenraum zwischen zwei Zellen. Ein Klick auf die gesetzte Mauer entfernt sie wieder. Ich darf höchstens 30 Mauern setzen. Ein Counter zeigt mir an, wie viele Mauern mir noch zur Verfügung stehen. Den Schatz platziere ich mit einem Klick auf eine Zelle. Er darf nicht auf A1 liegen, weil mein Gegner dort startet. Das zweite Spielfeld gehört meinem Gegner. Dort sehe ich später meine Position, meine besuchten Felder und die Mauern, die ich im gegnerischen Labyrinth entdeckt habe. 
In der linken oberen Ecke läuft ein Timer von drei Minuten rückwärts. Er startet, sobald beide Spieler im Spiel sind. Der Server gibt die Zeit vor, beide Spieler sehen dieselbe Restzeit. Der Server speichert meinen Entwurf nach jeder Änderung. Wenn ich die Seite neu lade, mache ich an derselben Stelle weiter. 

## Prüfung der Lösbarkeit
Sobald der Schatz platziert ist, prüft der Server nach jeder Änderung, ob der Schatz von A1, dem Startfeld, aus erreichbar ist. Eine Anzeige meldet "Schatz erreichbar" oder "Schatz nicht erreichbar". Wenn der Schatz nicht erreichbar ist, markiert das Spiel die Mauern am Rand des Bereichs, den ich von A1 aus erreiche. Wenn ich eine dieser Mauern entferne, wächst der Bereich. Solange der Schtz nicht erreichbar ist, bleibt der Button "Irrgarten setzen" gesperrt. 

## Irrgarten setzen 
Unten rechts klicke ich auf "Irrgarten setzen". Damit melde ich meinem Gegner und dem Server, dass mein Irrgarten fertig ist. Danach ändere ich weder Mauern noch Schatz. Wenn die drei Minuten ablaufen, setzt der Server alle Irgärrten, die noch offen sind. 

- Fehlt der Schatz, platziert der Server ihn zufällig auf einer Zelle, die ich von A1 aus erreiche. A1 selbst scheidet dabei aus. 
- Ist mein Schatz zu diesem Zeitpunkt nicht erreichbar, bekomme ich eine weitere Minute zum Überarbeiten. Mein Gegner sieht den Hinweis "Gegner überarbeitet seinen Irrgarten", aber keine Details. 
- Ist der Schatz nach dieser Minute noch nicht erreichbar, öffnet der Server zufällig eine der markierten Mauern, bis der Schatz erreichbar ist, und setzt den Irrgarten. 

## Bereitschaft
Sobald beide Irrgärten stehen, erscheint ein Overlay mit der Frage "Bist du bereit zu spielen?" und dem Button "Spiel starten". Damit prüft der Server, ob ich noch anwesend bin. Ich habe dafür dreißig Sekunden Zeit. 

- Klicken beide Spieler, teilt der Server mit, wer beginnt. 
- Klickt nur ein Spieler in der vorgegebenen Zeit, gewinnt dieser die Partie. 
- Klickt keiner, bricht der Server das Match ohne Ergebnis ab. 

## Spielablauf
Wer am Zug ist, stellt Anfragen. Eine Anfrage nennt ein Zielfeld auf dem zweiten Spielfeld. Das Zielfeld liegt in derselben Zeile oder Spalte wie meine Figur, z. B. A1 nach A4. Diagonale Ziele sind nicht möglich. Meine Figur startet auf A1 und bleibt zwischen den Zügen stehen. Der Server kennt beide Irrgärten und beantwortet jede Anfrage. 

- Antwortet er mit "Ja", stehe ich auf dem Zielfeld und stelle die nächste Anfrage. Dabei darf ich die Richtung wechseln, z. B. von A4 nach C4. 
- Antwortet er mit "Nur bis A3", stehe ich auf A3. Die Mauer vor dem nächsten Feld erscheint auf meiner Karte und mein Zug endet. 
- Antwortet er mit "Nein", liegt eine Mauer direkt vor meinem ersten Zielfeld. Ich bleibe stehen, die Mauer erscheint auf meiner Karte und mein Zug endet.
- Liegt der Schatz auf der Strecke meiner Anfrage, ziehe ich bis zum Schatz. Das Spiel endet und ich gewinne. 

Mein Gegner sieht meine Anfragen und die Antworten live. Auf seinem blauen Spielfeld zeichnet das Spiel meinen Weg ein. Der Server zählt die Anfragen jedes Spielers. Wenn ich in meinem Zug 60 Sekunden lang keine Anfrage sende, verliere ich das Spiel. Mein Client fragt den Spielstand regelmäßig beim Server ab. Bleibt diese Abfrage 15 Sekunden lang aus, wertet der Server das als Verbindungsabbruch und ich verliere. Mit dem Button "Aufgeben" gebe ich auf und verliere ebenfalls. Ein Spiel lässt sich nicht pausieren. 

## Spielenede
Das Spiel endet, wenn ein Spieler den Schatz findet, aufgibt oder wegen Inaktivität oder Verbindungsabbruch verliert. Die Ansicht zeigt den Sieger, die Anzahl der Anfragen beider Spieler und beide Irrgärten. Über "Zum Dashboard" kehre ich zurück. Der Server speichert das Ergebnis selbst. Der Client trägt keine Ergebnisse ein. 

# Computer-Gegner
Wenn ich gegen den Computer spiele, baue ich meinen Irrgarten wie gegen einen Menschen. Der Server erzeugt den Irrgarten des Computers mit der Schwierigkeit aus meiner Dashbaord-Einstellung. Der Computer setzt sofort, ich warte auf niemanden. Er sucht meinen Schatz mit denselben Anfragen wie ein Mensch. ich sehe sie live auf meinem Spielfeld. Sieg und Niederlage zählen wie gegen einen Menschen. 

# Turnier
Ein Turnier hat vier Spieler und zwei Runden 

## Warteraum
Wenn ich ein Turnier erstelle, lande ich im Warteraum. Alle Teilnehmer sehen dort die Namen und die Anzahl der Spieler. 

- Ein Turnier hat höchstens vier Spieler. 
- Verlässt ein Teilnehmer den Warteraum, entfernt der Server ihn aus der Liste. 
- Verlasse ich selbst als Host den Warteraum, endet das Turnier und der Code wird ungültig. 
Der Code verfällt nach 30 min ohne Start. 

## Start
Ab drei Spielern aktiviert sich der Button "Turnier starten", nur für den Host. Fehlt der vierte Spieler, ergänzt der Server einen Computer-Spieler. Der Computer verwendet die Schwierigkeit, die der Host in seinem Dashboard eingestellt hat. Mit weniger als drei Spielern startet das Turnier nicht. Zwei Freunde speilen dann ein Duell. 

## Runde 1 
Der Server lost zwei Paarungen aus. Der Computer spielt gegen einne Menschen. Jedes Match läuft wie ein Spiel gegen einen Live-Gegner, mit eigenem Aufbau. Das match gegen den Computer läuft wie ein Spiel gegen den Computer-Gegner. 

## Runde 2
Sobald beide Matches der ersten Runde enden, spielen die Verlierer um Platz 3 und 4, die Gewinner um Platz 1 und 2. Jedes Match beginnt mit einem neuen Aufbau. Wer früher fertig ist, sieht einen Wartebildschirm. Eine Turnierübersicht zeigt allen Spielern die Paarungen und den Stand. Am Ende zeigt sie die Platzierung. 

## Verlassen 
Wenn ich ein laufendes Match verlasse oder 60 Sekunden lang keine Anfrage sende, verliere ich dieses Match und alle folgenden Spiele des Turniers. Mein Gegner gewinnt kampflos. Erscheint in einem Match keiner der beiden Spieler zum Start, endet das Turnier ohne Wertung. Jedes Match zählt als eigenes Spiel. 

# Ergebnisse
Der Button "Ergebnisse" öffnet die vollständige Liste meiner gewonnen und verlorenen Spiele. Unter "Details" klappe ich pro Spiel zusätzliche Daten auf. 

- Datum und Uhrzeit
- Gegner (Name oder Computer)
- Schwierigkeit (nur bei Spielen gegen den Computer)
- Anzahl meiner Anfragen
- Ende des Spiels (Schatz gefunden, Aufgabe oder Zeit)
- Turnier und Runde (wenn das Spiel zu einem Turnier gehört)

# Fehlermeldungen
Die Anwendung zeigt eine Fehlermeldung in den folgenden Fällen: 
 
- Der Benutzername ist vergeben. 
- Das Passwort ist falsch. 
- Die beiden Passwörter bei der Registrierung stimmen nicht überein. 
- Der Spielcode ist ungültig oder abgelaufen. Das gilt auch, wenn ein Duell-Code im Feld "Turnier beitreten" steht oder umgekehrt. 
- Das Turnier ist voll oder läuft bereits. 
- Der Schatz ist nicht erreichbar. 

# Spätere Erweiterungen
- Turnier mit acht Spielern, aufgefüllt mit Computer-Gegnern (Mindestanzahl an Spielern noch offen)
- Gastmodus nur gegen den Computer. Ergebnisse nur lokal 
- Ein gemeinsames Eingabefeld für Duell- und Turnier-Codes, bei dem der Server die Art des Codes erkennt
- Zufälliger Live-Gegner über eine offene Warteschlange
- Nutzername und Passwort ändern
- Rangliste über alle Spieler, nur mit Siegen gegen Menschen