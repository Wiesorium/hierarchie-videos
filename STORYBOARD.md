# Storyboard-Format

Jedes Video ist eine Datei `episodes/<datum>-<slug>/storyboard.json`. Die Engine liest sie, legt alle Zeiten an die
Wörter der Stimme und rendert drei Varianten (Hook a, b, c). Ein vollständiges Beispiel steht in
`episodes/_beispiel-das-abgemalte-zeichen/storyboard.json` (Martins freigegebenes Video vom 14.11.2026).

## Bildfläche

- 1080 × 1920 px. Figuren stehen auf der Grundlinie y = 1478.
- **Oben frei lassen:** y < 450 gehört Hook-Karte und Untertiteln. Inhalte zwischen y 450 und 1450.
- Links/rechts mindestens 40 px Rand. Der Schrank steht meist rechts (x 600–700), Figuren links davon.
- Kinder sind automatisch 2/3 so groß wie Erwachsene.

## Oberste Felder

| Feld | Inhalt |
| --- | --- |
| `slug` | Dateiname aus der Frage des Videos, klein, Bindestriche, Umlaute ausgeschrieben |
| `title` | Titel |
| `cta` | `whatsapp` (Entdeckerfreunde, Eltern/Kinder-Themen), `kurs` (Vertikales Wissen, Erwachsenen-Themen) oder `follow` (Teil 1 eines Zweiteilers) |
| `hero` | id der Hauptfigur; der Zoom am Anfang landet bei ihr |
| `hooks` | `a`, `b`, `c`: je `label`, `audio` (gesprochener Hook-Satz) und `card` (1–2 Zeilen Text-Karte, Zeile 2 in Rosé) |
| `script` | `lockin`, `block1`, `rehook1`, `block2`, `rehook2`, `block3` (optional), `closing` (die Frage), `cta` |
| `question` | die Closing-Frage auf zwei Zeilen für die Fragekarte (gleiche Wörter wie `script.closing`) |
| `endcard` | optional: `title`, `pill`, `lines` (2), `button` – überschreibt die Standard-Endkarte |
| `scenes` | Liste der Szenen (siehe unten) |
| `hits` | 8 Treffer: `{"at": Anker, "x", "y"}` – Zoom-Stoß, Funken und Musik-Schlag genau auf dem Wort |

## Anker (Zeitpunkte)

Ein Anker ist eine **Wortfolge, wie sie gesprochen wird** (Groß/Klein und Satzzeichen egal): `"zwei Wellen"`.
Gesucht wird ab dem Start der Szene, in der das Element steht.

- `"end:zur Schule"` – Ende statt Anfang der Wortfolge
- `"roter Strich#2"` – das zweite Vorkommen (ab Szenenstart)
- `"roter Strich+0.3"` – 0,3 s später (auch `-0.2`)
- `"start"` – Anfang des Hauptteils, `"always"` – schon während des Hooks sichtbar, `"end"` – bis zum Schluss
- `"@12.5"` – feste Sekunde im Hauptteil (nur im Notfall)

Zahlen schreibt das Transkript manchmal als Ziffer („10“ statt „zehn“). Anker deshalb lieber auf Wörter ohne Zahlen legen.
`build.py check` meldet jeden Anker, den es nicht findet, mit Vorschlägen.

## Szenen

```json
{"at": "Schau dir das als Knoten", "chord": "G", "elements": [ ... ]}
```

- `at`: Anker für den Szenenstart (die erste Szene beginnt immer bei `start`).
- `chord`: Musik-Akkord der Szene: `D`, `G`, `A` (hell), `Bm`, `Em`, `F#m` (Moll, wenn etwas nicht passt oder Angst macht).
- Elemente leben von Szenenstart bis Szenenende, außer `in`/`out` sagen etwas anderes oder `"keep": true`.
- **Gleiche `id` in einer späteren Szene = dasselbe Element.** Es bleibt sichtbar und gleitet in 0,8 s an das neue `x`/`y`;
  eine neue `mood` gilt ab Szenenstart. So bleibt eine Figur über Szenen hinweg im Bild.

## Gemeinsame Element-Felder

`id` (Pflicht, eindeutig), `type`, `x`, `y`, `in`, `out`, `keep`, `z` (Zeichenreihenfolge, größer = weiter vorn),
`enter` (`pop`, `hop`, `fade`, `slide`, `slide-up`, `none`), `moves: [{"at", "x", "y", "dur"}]`.
Eine Figur ohne `y` steht auf 1478; `moves` mit `y` heben sie z. B. auf eine Requisite (`"y": 1298` = auf einem 180 px hohen Polsterberg).

Standard-Reihenfolge von hinten nach vorn: prop 0 · cabinet/tree 1 · node 2 · figure 3 · link/arrow 4 · card 5 ·
bubble/thought 6 · stamp/tag/icon 7. Ein Tisch vor Figuren braucht `"z": 3.5`.

Farben: Hex (`#C14E78`) oder Namen aus der Palette: `ink`, `rose`, `plum`, `gold`, `ochre`, `sage`, `paper`,
`people` (Flieder), `baby` (Babyblau), `kids` (Rosé hell), `fresh` (Mint), `idea` (Vanille), `food` (Creme), `ice` (Eisblau).

Text in Karten, Blasen, Tags, Schubladen: `*Wort*` = Rosé, `_Wort_` = Pflaume, `~Wort~` = Grün, `^Wort^` = Ocker.
Das Zeichen ≈ wird von Hand gezeichnet. Andere Sonderzeichen (♪, Emojis) gibt es in Patrick Hand nicht.

## Element-Typen

### figure
```json
{"id": "felix", "type": "figure", "role": "boy", "x": 290, "look": "right", "mood": "smile",
 "moods": [{"at": "roter Strich", "mood": "sad"}],
 "gestures": [{"at": "Genau zehn", "kind": "think", "dur": 1.6}],
 "talk": [["Ungefähr zehn Minuten", "end:zehn Minuten"]], "hop": "Juhu"}
```
- `role`: `mama`, `papa`, `woman`, `man`, `oma`, `opa`, `teacher`, `girl`, `boy`, `teen`, `toddler`
- optional: `shirt`, `pants`, `hair` (`bun`, `ponytail`, `short`, `spiky`, `long`, `bald`), `hairColor` (`brown`, `dark`, `blond`, `red`, `grey`, `black`), `glasses`, `scale`, `pose: "sit"`
- optional außerdem: `skin` (`light`, `medium`, `tan`, `brown`, `dark`).
- Aussehen wie in den freigegebenen Reels (Bild im Brand-Style-Doc): Haar als Papierkappe mit geradem Schnitt, Dutt bzw.
  Pferdeschwanz auf der Rückseite, Punktaugen, eine rosa Wange auf der Blickseite, Ärmel und hautfarbene Unterarme,
  schmale Beine ohne Schuhe. `look` dreht Gesicht und Wange; `think` legt die Hand ans Kinn.
- `mood`: `smile`, `happy`, `grin`, `laugh`, `open`, `wow`, `sad`, `worried`, `scared`, `neutral`
- `gestures.kind`: `wave`, `point`, `cheer`, `raise`, `shrug`, `think`, `hug`
- `talk`: Zeitspannen, in denen sich der Mund mit der Stimme bewegt (für zitierte Sätze der Figur)
- `look`: `left`, `right`

### prop
`{"id": "board", "type": "prop", "kind": "blackboard", "x": 560, "y": 720, "w": 700, "h": 340, "text": ["Runden", "347 ≈ 350"], "size": 66}`

`kind`: `table`, `desk`, `chair`, `sofa`, `bed`, `bench`, `door`, `tree`, `car`, `backpack`, `ball`, `cup`, `plate`, `sign`, `shelf`,
`pot` (Kochtopf mit Dampf; `"steam": false` ohne Dampf), `fridge` (Kühlschrank; `"open": true` zeigt das helle Innere mit Gläsern,
Tür an `"doorSide"` `left`/`right`), `bowl` (Salatschüssel; `"leaves": false` = leer), `bottle` (Flasche mit Korken, `text` aufs Etikett),
`cushions` (Polsterberg aus sechs Kissen, Oberkante y − h) (y = Boden, Standard 1478; Topf/Tasse/Teller auf einem Tisch: y = Tischplatte) sowie `blackboard`, `notebook`, `phone`, `book`, `clock`, `window`, `tv`, `laptop`, `stars`
(y = Mitte). `text` (Zeile oder Liste), `size`, `color`, `screen` (Bildschirmfarbe).

### cabinet – der Wissensschrank
```json
{"id": "kopf", "type": "cabinet", "x": 640, "y": 560, "w": 600, "rowH": 118,
 "rows": [["oben"], ["plus", "minus", "welle"], ["bedeutung"]],
 "drawers": {
   "oben": {"label": "Ich kann Mathe nicht.", "color": "kids", "in": "ganz oben auf", "states": [{"at": "ganz oben auf", "state": "heavy+red"}]},
   "welle": {"label": "≈", "color": "idea", "size": 52, "states": [{"at": "zu dem einen Zeichen", "state": "cross"}]},
   "bedeutung": {"label": "Bedeutung", "emptyLabel": "Bedeutung", "states": [{"at": "start", "state": "empty"}]}
 }}
```
- `rows`: von oben (Ideen, Begriffe) nach unten (Erlebnisse, Dinge, Personen). Jede Reihe teilt sich die Breite.
- Schublade: `label`, `sub` (zweite Zeile, Pflaume), `color`, `size`, `icon`, `in` (rastet mit Hopser ein), `states`, `emptyLabel`.
- optional: `title` (über dem Schrank), `sideLabels: ["oben", "unten"]`.
- Aussehen wie in den freigegebenen Reels: Holzrahmen, cremefarbenes Inneres mit Regalbrettern, Schubladen als Pastell-Karten
  (Beschriftung links, ohne Knauf), leere Fächer bis zu den kurzen Beinen am Boden (`legs`: Beinlänge, Standard 64).

### Zustände (`states`) für Schubladen und Knoten
`normal`, `empty` (gestrichelter leerer Platz mit „?“ oder `emptyLabel`), `glow` (pulsiert golden), `gold` (Goldrahmen),
`check`, `cross`, `question` (Abzeichen), `shake` (wackelt kurz), `dim`, `heavy` (drückt), `red` (rosé Rand), `open` (zieht sich auf).
Kombinieren mit `+`: `"gold+check"`. Ein Zustand gilt bis zum nächsten; `shake` fällt nach 0,7 s zurück.

### tree – Knoten in Ebenen
```json
{"id": "plan", "type": "tree", "x": 540, "y": 560, "w": 920, "rowGap": 200,
 "levels": [[{"id": "laufen", "label": "Laufen", "color": "idea"}],
            [{"id": "montag", "label": "Montag früh laufen", "in": "Montag"}],
            [{"id": "schuhe", "label": "Schuhe vor die Tür", "in": "Schuhe", "states": [{"at": "Schuhe", "state": "glow"}]}]],
 "links": [{"from": "laufen", "to": "montag", "style": "gold", "in": "Montag"}, {"from": "montag", "to": "schuhe", "in": "Schuhe"}]}
```

### node – ein einzelner Knoten
`{"id": "n1", "type": "node", "x": 400, "y": 700, "w": 260, "h": 100, "label": "≈", "size": 76, "color": "idea", "states": [...]}`

### link / arrow – Verbindungen
`{"id": "l1", "type": "link", "from": "n1", "to": "n2", "style": "gold", "in": "...", "label": "so ähnlich", "bend": 0}`
- `from`/`to`: id eines Knotens, einer Schublade oder ein Punkt `{"x", "y"}`
- `style`: `gold` (gepunkteter Goldfaden), `line`, `dashed`/`arrow` (gestrichelter Pfeil), `red` (rosé Pfeil)

### card, bubble, thought, stamp, tag, icon
- `card`: `{"x", "y", "lines": ["Zeile 1", "*Zeile 2*"], "size": 52}` – weiße Karte
- `bubble`: `{"from": "papa", "text": "Wie lang brauchst du?", "x", "y"}` – Sprechblase mit Spitze zur Figur.
  Zwei gleichzeitige Blasen immer mit eigenem `x`/`y` setzen, damit sie sich nicht überlappen.
- `thought`: `{"from": "felix", "text": "Ich kann *Mathe* nicht.", "x", "y"}` – Denkblase mit drei Punkten
- `stamp`: `{"text": "Bild", "x", "y", "rot": -0.09, "size": 58}` – schräger Rosé-Stempel für Schlüsselwörter
- `tag`: `{"text": "nächster Tag", "x", "y", "color": "plum"}` – weiße Pille
- `icon`: `{"kind": "bulb", "x", "y", "size": 90}` – `bulb`, `check`, `cross`, `question`, `exclaim`, `heart`, `star`, `moon`,
  `sun`, `clock`, `magnifier`, `balloon`, `plane`, `house`, `book`, `pencil`, `cloud`, `rain`, `zzz`, `note`, `hedgehog`
  (Igel, steht auf y + 0,3 × size, schaut nach rechts; `"look": "left"` spiegelt ihn), `planet` (Pastellkugel in `color`,
  `"ring": true` für einen Ring), `pluto` (beige Kugel mit hellem Herz), `lemon` (Zitrone mit Blatt), `bottle` (kleine Flasche)
- Schubladen und Knoten mit `icon` können dazu `iconColor` haben (z. B. `"icon": "planet", "iconColor": "#E8A08A"`).

## Was die Engine selbst macht

- Zoom aus dem Universum in die Szene ab dem ersten Bild, Hook-Karte ab dem ersten Bild mit leichter Bewegung.
- Untertitel als Karaoke oben, sobald die Hook-Karte weg ist; Closing-Frage und CTA ohne Untertitel.
- Beim Closing zoomt das Bild hinaus ins Universum, die Fragekarte erscheint Wort für Wort, beim CTA kommt die Endkarte.
- Musik (Pads im Akkord der Szene, Spieluhr/Marimba/Glocken auf Treffern, Shaker), Geräusche (Pop, Holzklick,
  Rascheln, Boing, Stempel), Mischung auf −14 LUFS.
- Drei Varianten mit eigenem Hook, gleicher Hauptteil.
