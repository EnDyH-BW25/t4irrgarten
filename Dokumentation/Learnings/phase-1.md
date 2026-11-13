# Learnings Phase 1 - Spiellogik als reine Funktionen

Phase 1 baut den fachlichen Kern des Spiels im Server. Alle späteren Phasen rufen diese Funktionen auf. Die Phase umfasst vier Schritte.

1. Koordinaten und Mauern parsen und prüfen
2. Erreichbarkeit per Breitensuche und problematische Mauern
3. Anfrage auswerten
4. Regeln prüfen

Alle Dateien liegen in `server/spiellogik/`. Zu jeder Datei gehört eine Testdatei `*_test.ts`. Am Ende der Phase laufen 54 Tests im Server.

## Grundprinzip: reine Funktionen

Eine reine Funktion hängt nur von ihren Eingaben ab und ändert nichts außerhalb. Gleiche Eingabe ergibt immer gleiche Ausgabe.

- Tests brauchen keinen Server, keine HTTP-Anfrage und keine Mocks. Ein Test besteht aus Eingabe und erwarteter Ausgabe.
- Reine Funktionen werfen keine Fehler. Sie liefern `null`, `false` oder ein Ergebnisobjekt. Erst die Route entscheidet über HTTP-Status und Fehlercode.
- Die Spiellogik kennt dadurch kein HTTP. Computer-Gegner und Generator nutzen später dieselben Funktionen.

Die Spiellogik weiß, **ob** etwas gültig ist. Die Route weiß, **was** das für die Antwort bedeutet. Siehe ADR-021.

## 1. Koordinaten und Mauern

Datei `koordinaten.ts`

### Learnings

- Ein regulärer Ausdruck prüft das Format einer Zelle. `^` und `$` verankern das Muster am Anfang und Ende, sonst passt auch `'xC4y'`.
- Ein Type Guard (`text is Zelle`) sagt TypeScript, dass ein geprüfter `string` danach eine `Zelle` ist.
- Rechnen geht besser mit Zahlen als mit Buchstaben. `zuPosition` und `zuZelle` wandeln in beide Richtungen um.
- Zwei Zellen sind Nachbarn, wenn ihr Abstand in Zeile plus Spalte genau 1 ist. Das schließt diagonale, entfernte und gleiche Zellen in einem Schritt aus.
- Für das Spiel sind `A1_A2` und `A2_A1` dieselbe Mauer, für JavaScript zwei verschiedene Texte. `mauerZwischen` stellt deshalb immer die kleinere Zelle nach vorn. Jede Mauer hat genau eine Schreibweise.

### Code

```ts
const ZELLE_MUSTER = /^[A-F][1-6]$/

export function istZelle(text: string): text is Zelle {
  return ZELLE_MUSTER.test(text)
}

export function sindNachbarn(a: Zelle, b: Zelle): boolean {
  const pa = zuPosition(a)
  const pb = zuPosition(b)
  const abstand = Math.abs(pa.zeile - pb.zeile) + Math.abs(pa.spalte - pb.spalte)
  return abstand === 1
}

export function parseMauer(text: string): Mauer | null {
  const teile = text.split('_')
  if (teile.length !== 2) return null
  const [a, b] = teile
  if (!istZelle(a) || !istZelle(b) || !sindNachbarn(a, b)) return null
  return mauerZwischen(a, b)
}

export function mauerZwischen(a: Zelle, b: Zelle): Mauer {
  // Kleinere Zelle zuerst, damit jede Mauer nur eine Schreibweise hat
  return a < b ? `${a}_${b}` : `${b}_${a}`
}
```

## 2. Erreichbarkeit und problematische Mauern

Datei `erreichbarkeit.ts`

### Learnings

- Die Breitensuche (BFS) startet bei A1 und erweitert den Bereich Schritt für Schritt. Eine Warteschlange liefert die nächste Zelle vorne, neue Zellen kommen hinten dazu.
- Ein `Set` findet Einträge sofort. Ein Array müsste alle Einträge durchgehen. `besucht` verhindert, dass eine Zelle zweimal in die Warteschlange kommt.
- Eine problematische Mauer liegt am Rand des erreichbaren Bereichs. Genau eine ihrer beiden Zellen ist erreichbar. Der Vergleich `a !== b` zweier Wahrheitswerte drückt "genau eine" aus.
- Der Name `problematischeMauern` ersetzt "Randmauern". Randmauern ließen sich mit den Außenwänden des Spielfelds verwechseln.
- `problematischeMauern` erhält den erreichbaren Bereich als Parameter. Der Aufrufer berechnet ihn einmal und nutzt ihn zweimal.

### Code

```ts
export function erreichbareZellen(mauern: Mauer[], start: Zelle = 'A1'): Set<Zelle> {
  const gesperrt = new Set(mauern)
  const besucht = new Set<Zelle>([start])
  const warteschlange: Zelle[] = [start]

  while (warteschlange.length > 0) {
    const zelle = warteschlange.shift()!
    for (const nachbar of nachbarn(zelle)) {
      if (besucht.has(nachbar)) continue
      if (gesperrt.has(mauerZwischen(zelle, nachbar))) continue
      besucht.add(nachbar)
      warteschlange.push(nachbar)
    }
  }
  return besucht
}

export function problematischeMauern(mauern: Mauer[], erreichbar: Set<Zelle>): Mauer[] {
  return mauern.filter((mauer) => {
    const [a, b] = zellenDerMauer(mauer)
    return erreichbar.has(a) !== erreichbar.has(b)
  })
}
```

## 3. Anfrage auswerten

Datei `anfrage.ts`, Typen `Antwort` und `AnfrageErgebnis` in `shared/types.ts`

### Learnings

- Deno verlangt vollständige Importpfade mit Endung `.ts`. Vite im Client ergänzt sie stillschweigend, Deno nicht.
- Alle gemeinsamen Typen kommen aus einer Datei. Ein Import `import type { A, B, C } from '../../shared/types.ts'` reicht.
- `Math.sign` macht aus einer Differenz eine Richtung (-1, 0 oder 1). Ein weites Ziel wird so zu einem einzelnen Schritt.
- `(zeile === 0) === (spalte === 0)` erkennt beide ungültigen Fälle auf einmal. Gültig ist nur genau eine Richtung.
- Die Reihenfolge im Lauf ist entscheidend. Erst die Mauer prüfen, dann den Schritt gehen, dann den Schatz prüfen. Sonst findet der Spieler einen Schatz durch eine Mauer hindurch.
- Eine Mauer hinter dem Ziel bleibt unentdeckt. Der Lauf erreicht sie nie.
- Nach links und oben ruft der Lauf `mauerZwischen` mit vertauschten Zellen auf. Die einheitliche Schreibweise sorgt dafür, dass `gesperrt.has` die Mauer trotzdem findet.
- Der Rückgabetyp `AnfrageErgebnis` lässt TypeScript jedes `return` prüfen. Ein Tippfehler wie `'nurbis'` fällt sofort auf.

### Code

```ts
function richtung(a: Zelle, b: Zelle): Position | null {
  const pa = zuPosition(a)
  const pb = zuPosition(b)
  const zeile = Math.sign(pb.zeile - pa.zeile)
  const spalte = Math.sign(pb.spalte - pa.spalte)
  if ((zeile === 0) === (spalte === 0)) return null
  return { zeile, spalte }
}
```

```ts
while (aktuell !== ziel) {
  const p = zuPosition(aktuell)
  const naechste = zuZelle(p.zeile + schritt.zeile, p.spalte + schritt.spalte)
  if (!naechste) return null

  // Zuerst die Mauer
  const mauer = mauerZwischen(aktuell, naechste)
  if (gesperrt.has(mauer)) {
    const ergebnis = aktuell === position ? 'nein' : 'nurBis'
    return { ziel, ergebnis, position: aktuell, mauer }
  }

  // Dann der Schritt und der Schatz
  aktuell = naechste
  if (aktuell === schatz) {
    return { ziel, ergebnis: 'schatzGefunden', position: aktuell, mauer: null }
  }
}
return { ziel, ergebnis: 'ja', position: ziel, mauer: null }
```

## 4. Regeln prüfen

Datei `regeln.ts`, Typ `Pruefung` und Konstante `MAX_MAUERN` in `shared/types.ts`

### Learnings

- Der Vertrag trennt zwei Prüfungen. Die **Form** führt bei Fehlern zu 400 `VALIDIERUNG`. Die **Lösbarkeit** ist kein Fehler, sondern ein Zwischenstand beim Bauen und kommt mit 200 zurück.
- `entwurfPruefen` sammelt alle Probleme, statt beim ersten aufzuhören. Der Spieler sieht alles auf einmal.
- Eingaben von außen sind Texte. Erst die Prüfung macht daraus `Zelle` und `Mauer`.
- Eine Discriminated Union (Typ mit Unterscheidungsfeld wie `ok`) lässt TypeScript nach `if (ergebnis.ok)` wissen, welche Felder es gibt.
- Doppelte Mauern erkennt die Prüfung nach `parseMauer`. Dadurch gilt auch `A2_A1` als Doppelung von `A1_A2`.
- `MAX_MAUERN` steht in `shared/types.ts`. Server-Prüfung und Client-Zähler nutzen denselben Wert.
- `loesbarkeitPruefen` entscheidet, dass `problematischeMauern` nur bei `loesbar: false` gefüllt ist. `problematischeMauern` selbst liefert immer die Mauern am Rand.
- Funktionsnamen folgen einem Muster. Aussagen wie `istZelle` liefern `boolean`. Tätigkeiten wie `loesbarkeitPruefen` liefern ein Ergebnisobjekt. Ein Name wie `schatzErreichbar` für ein Objekt verleitet zu `if (schatzErreichbar(e))`, und das ist immer wahr.

### Code

```ts
export type EntwurfErgebnis =
  { ok: true; entwurf: LabyrinthEntwurf } | { ok: false; details: Detail[] }

for (const [i, text] of eingabe.mauern.entries()) {
  const mauer = parseMauer(text)
  if (!mauer) {
    details.push({
      feld: `mauern[${i}]`,
      problem: `${text} ist keine Mauer zwischen zwei Nachbarzellen.`,
    })
  } else if (mauern.includes(mauer)) {
    details.push({ feld: `mauern[${i}]`, problem: `Die Mauer ${mauer} ist doppelt.` })
  } else {
    mauern.push(mauer)
  }
}
```

```ts
export function loesbarkeitPruefen(entwurf: LabyrinthEntwurf): Pruefung {
  if (entwurf.schatz === null) {
    return { loesbar: null, meldung: null, problematischeMauern: [] }
  }
  const erreichbar = erreichbareZellen(entwurf.mauern, START)
  if (erreichbar.has(entwurf.schatz)) {
    return { loesbar: true, meldung: 'Schatz erreichbar', problematischeMauern: [] }
  }
  return {
    loesbar: false,
    meldung: 'Schatz nicht erreichbar',
    problematischeMauern: problematischeMauern(entwurf.mauern, erreichbar),
  }
}
```

## 5. Testen

- Ein Test prüft das ganze Ergebnis, wenn alle Felder zählen, zum Beispiel Position **und** Mauer bei `nurBis`. Sonst prüft er gezielt ein Feld mit `?.ergebnis`.
- `?.` verhindert einen Absturz, wenn eine Funktion `null` liefert. Der Test scheitert dann mit einer verständlichen Meldung.
- Testdaten müssen genau das prüfen, was der Testname sagt. `Array(30).fill('A1_A2')` enthält 30 gleiche Mauern und scheitert an Doppelungen, nicht an der Grenze. Für "30 sind erlaubt" braucht es 30 verschiedene Mauern.
- Tests sichern Entscheidungen ab. "Ein Schatz hinter einer Mauer bleibt verborgen" schlägt fehl, wenn jemand die Reihenfolge im Lauf vertauscht.
- `as Mauer` sagt TypeScript, dass ein zusammengesetzter Text eine Mauer ist. `as const` reicht dafür nicht.

## 6. Werkzeuge und Arbeitsweise

- `deno check datei.ts` zeigt Typfehler, ohne Tests auszuführen.
- `deno fmt` gilt mit den Regeln aus `server/deno.json` nur für `server/`. Für `shared/` ist Prettier zuständig.
- Neuer Code und seine Tests kommen in einen Commit (`feat`). Nur nachträgliche Tests für bestehenden Code bekommen einen eigenen Commit (`test`).
- `git diff --staged --stat` vor jedem Commit zeigt, ob die richtigen Dateien drin sind.
- `git commit --amend` ist nur vor dem Push unproblematisch. Danach kennen andere den alten Commit.
- Zugangsdaten gehören in den Schlüsselbund (`osxkeychain`), nicht im Klartext in `~/.git-credentials`. Ein Fine-grained Token beschränkt die Rechte auf ein Repo und läuft ab.

## Kontrollfragen

1. Warum liefert `parseMauer` bei ungültiger Eingabe `null` und wirft keinen `ApiFehler`?
2. Warum findet `gesperrt.has(mauerZwischen('D3', 'D2'))` die Mauer `D2_D3`?
3. Was antwortet der Server bei Mauer `A3_A4`, Position `A1` und Ziel `A3`, und warum?
4. Warum führt ein unlösbarer Entwurf zu 200 und nicht zu einem Fehler?
5. Warum markiert `loesbarkeitPruefen` bei eingemauertem A1 nicht die Mauer direkt am Schatz?
