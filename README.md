# Irrgarten

Irrgarten ist eine Web-Umsetzung des Originalspiels "Irrgarten" von MB Spiele aus dem Jahre 1977. Hierbei bauen zwei Spieler jeweils ein Labyrinth auf einem Feld von 6x6 Zellen, in dem sie einen Schatz platzieren. Danach wird abwechselnd im 1 gegen 1 die Erreichbarkeit der Zellen erfragt und so das Labyrinth des Gegners erkundet. Gewonnen hat der Spieler, der zuerst den Schatz im gegnersichen Irrgarten gefunden hat.

Die Anwendung bietet ein Spiel gegen den Computer, ein Live-Duell per Spielcode und ein Turnier. Ein Server mit REST-API prüft alle Züge und speichert Konten und Ergebnisse.

Projekt im Modul Software Engineering, DHBW, Studiengang WON25.

## Aufbau des Repositorys

| Ordner           | Inhalt                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `client/`        | Frontend mit Vue 3, Vite, Vue Router und Tailwind CSS 4                                                  |
| `server/`        | REST-Server mit Deno und Hono                                                                            |
| `shared/`        | Gemeinsame TypeScript-Typen für Client und Server                                                        |
| `Dokumentation/` | ADRs, Anwendungsfälle im Klartext, OpenAPI-Vertrag, Diagramme, Learnings, Präsentation, KI-Dokumentation |

## Voraussetzungen

| Werkzeug | Version                                    | Download           |
| -------- | ------------------------------------------ | ------------------ |
| Deno     | 2.x (getestet mit 2.9.7)                   | https://deno.com   |
| Node.js  | 22.18 oder ab 24.12 (getestet mit 24.13.0) | https://nodejs.org |
| npm      | wird mit Node.js installiert               |                    |

Prüfen der Installation:

```bash
deno --version
node --version
```

## Lokales Deployment

Server und Client laufen als zwei getrennte Prozesse. Beide brauchen ein eigenes Terminal.

### 1. Server starten

```bash
cd server
deno task dev
```

Deno lädt die Abhängigkeiten beim ersten Start automatisch. Der Server läuft danach auf `http://localhost:8000`. Er legt beim Start den Ordner `server/data/` an, falls er fehlt.

Wichtig: Den Befehl im Ordner `server/` ausführen. Der Server legt seine Daten relativ zu diesem Ordner ab.

### 2. Client starten

Im zweiten Terminal:

```bash
cd client
npm install
npm run dev
```

`npm install` ist nur beim ersten Start nötig. Vite startet den Client auf `http://localhost:5173`.

### 3. Spiel öffnen

Im Browser `http://localhost:5173` öffnen. Auf dem Startbildschirm ein Konto registrieren. Danach öffnet sich das Dashboard.

Der Client leitet alle Anfragen an `/api` über den Vite-Proxy an den Server auf Port 8000 weiter (ADR-020). Ohne laufenden Server meldet der Client "Der Server ist nicht erreichbar.".

### Live-Duell und Turnier testen

Für ein Duell braucht es zwei angemeldete Spieler. Dafür einen zweiten Browser oder ein privates Fenster öffnen und dort ein zweites Konto registrieren. Ein Spieler erstellt das Spiel und erhält einen Spielcode. Der andere tritt mit diesem Code bei.

Andere Geräte im selben WLAN erreichen den Client über `http://<IP-des-Rechners>:5173`. Vite gibt diese Adresse beim Start unter "Network" aus.

## Tests

Server-Tests:

```bash
cd server
deno task test
```

Client-Tests:

```bash
cd client
npm run test:unit -- --run
```

Weitere Befehle im Client:

| Befehl               | Zweck                                         |
| -------------------- | --------------------------------------------- |
| `npm run build`      | Typprüfung und Produktions-Build nach `dist/` |
| `npm run type-check` | Nur Typprüfung                                |
| `npm run lint`       | ESLint und Oxlint                             |
| `npm run format`     | Formatierung mit Prettier                     |

## Datenhaltung

| Daten                       | Ort                           | Nach Server-Neustart |
| --------------------------- | ----------------------------- | -------------------- |
| Konten mit Passwort-Hash    | `server/data/nutzer.json`     | bleiben erhalten     |
| Ergebnisse beendeter Spiele | `server/data/ergebnisse.json` | bleiben erhalten     |
| Sessions, Matches, Turniere | Arbeitsspeicher               | gehen verloren       |

Die JSON-Dateien stehen in `.gitignore`. Ein frisch geklontes Repository startet deshalb ohne Konten. Zum Zurücksetzen den Server stoppen und die beiden Dateien löschen. Die Gründe stehen in ADR-023, ADR-026 und ADR-029.

## Häufige Probleme

| Problem                                  | Lösung                                                          |
| ---------------------------------------- | --------------------------------------------------------------- |
| "Der Server ist nicht erreichbar."       | Server im Ordner `server/` mit `deno task dev` starten          |
| Port 8000 oder 5173 belegt               | Anderen Prozess auf diesem Port beenden                         |
| `npm run dev` meldet Node-Versionsfehler | Node.js 22.18 oder ab 24.12 installieren                        |
| Nach Server-Neustart abgemeldet          | Erwartet, Sessions liegen nur im Arbeitsspeicher. Neu anmelden. |

## Dokumentation

| Datei                                 | Inhalt                                        |
| ------------------------------------- | --------------------------------------------- |
| `Dokumentation/Spielanleitung.md`     | Regeln des Original-Brettspiels               |
| `Dokumentation/Irrgarten_Klartext.md` | Anwendungsfälle aus Sicht des Spielers        |
| `Dokumentation/openapi.yaml`          | REST-Vertrag zwischen Client und Server       |
| `Dokumentation/ADR_Irrgarten.md`      | Architekturentscheidungen ADR-001 bis ADR-040 |
| `Dokumentation/UmsetzungIrrgarten.md` | Umsetzungsplan in Phasen                      |
| `Dokumentation/design.md`             | Schriften, Farben, Animationen                |
| `Dokumentation/Diagramme/`            | Architektur- und Sequenzdiagramm              |
| `Dokumentation/Learnings/`            | Erkenntnisse pro Phase                        |
| `Dokumentation/Präsentation/`         | Vortragsfolien                                |
| `Dokumentation/KI-Dokumentation.md`   | Nachweis der KI-Nutzung                       |

## Verwendete Bibliotheken und Ressourcen

| Name              | Zweck                       | Lizenz | Quelle                                       |
| ----------------- | --------------------------- | ------ | -------------------------------------------- |
| Deno              | Laufzeitumgebung Server     | MIT    | https://deno.com                             |
| Hono              | Web-Framework Server        | MIT    | https://hono.dev                             |
| Vue 3, Vue Router | Frontend-Framework, Routing | MIT    | https://vuejs.org                            |
| Vite, Vitest      | Build-Werkzeug, Testrunner  | MIT    | https://vite.dev, https://vitest.dev         |
| Tailwind CSS 4    | Styling                     | MIT    | https://tailwindcss.com                      |
| Tabler Icons      | Icons                       | MIT    | https://tabler.io/icons                      |
| Bowlby One        | Schrift für Überschriften   | OFL    | https://fonts.google.com/specimen/Bowlby+One |
| Rubik             | Schrift für Texte           | OFL    | https://fonts.google.com/specimen/Rubik      |

Die Spielidee stammt vom Brettspiel "Irrgarten" (MB, 1977). Die Regeln stehen in `Dokumentation/Spielanleitung.md`.

## KI-Nutzung

Das Projekt entstand mit Unterstützung von KI-Werkzeugen. Art und Umfang beschreibt `Dokumentation/KI-Dokumentation.md`.
