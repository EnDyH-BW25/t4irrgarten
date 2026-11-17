# Schriften:

- BowlbyOne-Regular.ttf für Titel und Überschriften
- Rubik-VariableFont_wght.ttf für Texte

# Farben:

=> Tailwind-Werte

## Spielfelder

- Spielfeld meines Irrgartens, den mein Gegner erkundet: blue-300
- Spielfeld, auf dem ich den gegnerischen Irrgarten erkunde: orange-300

## Spielelemente

Jeder Irrgarten bleibt in einer Farbfamilie. Mein Irrgarten ist ganz blau, der gegnerische ganz orange. Die Plättchen liegen eine Stufe über dem Feld, damit sie sich abheben, ohne zu dominieren.

- Mauern meines Irrgartens, den mein Gegner erkundet: blue-600
- Plättchen meines Irrgartens: blue-400
- Mauern des gegnerischen Irrgartens, den ich erkunde: orange-600
- Plättchen des gegnerischen Irrgartens: orange-400
- Plättchen: in beiden Irrgärten gleich groß, 18 % Abstand zum Feldrand
- Schatz: cyan-300
- Spielfiguren: slate-900

## Animationen

- Spielfigur gleitet in 350 ms zum nächsten Feld
- Neue Plättchen springen kurz auf
- Neu entdeckte Mauern blenden in 300 ms ein
- Schatz taucht mit einer Drehung auf, etwa beim Aufdecken nach Spielende
- Steht die Figur auf dem Schatz, rücken beide auseinander: Schatz oben links und auf 75 % verkleinert, Figur in voller Größe unten rechts. Eine Kopie des Diamanten pulsiert.
- Ergebniskasten, Warteraum und Bereitschafts-Dialog zoomen beim Erscheinen herein
- Anfragebox (ADR-037): erst die Anfrage, das Zielfeld blinkt mit einem Rahmen. Nach 1,5 s zoomt die Antwort als Etikett herein, dann zieht die Figur. Die Antwort bleibt 2,1 s stehen. Im Duell läuft ein Rückstand dreimal so schnell.
- Antwort-Etiketten: Ja green-100/green-800, Nur bis amber-100/amber-900, Nein red-100/red-800, Schatz cyan-100/cyan-900
- Bei "Bewegung reduzieren" im Betriebssystem sind alle Animationen aus

## Icons

=> von tablericons

- Schatz: diamond (IconDiamond)
- Ich im gegnerischen Irrgarten: ghost-2 (IconGhost2), weil mir das Labyrinth unbekannt ist
- Gegner in meinem Irrgarten: robot (IconRobot)
- Plättchen: keine Icons, abgerundete Quadrate in den Farben oben
