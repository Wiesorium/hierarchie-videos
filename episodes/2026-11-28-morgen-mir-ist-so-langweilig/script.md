# Mir ist so langweilig! (Video 1 von 3: Kinderzitat)

- Datum: 28.11.2026, Morgenlauf (automatisch). Keine Idee in `state/ideas.json` offen, Thema selbst gewählt; Reihe
  „Nora und die Langeweile“, drei eigene Videos.
- Format: nach Martins Leitlinie vom 22.11.2026: drei eigene Videos pro Thema, je ein Hook-Typ (Kinderzitat, Ergebnis zuerst,
  Du-Fehler), Folge-CTA, Nahaufnahme ab Bild 1, Lücke Hook → Hauptteil 0,12 s, Sound-Akzent auf dem ersten Wort.
- **Stand: wartet auf Stimme.** Am 28.11.2026 waren die ElevenLabs-Credits aufgebraucht (0 übrig, Reset 1.12.2026 18:16).
  Skript, Storyboard, tts.json und Captions sind fertig; das Storyboard ist mit einer Platzhalter-Stimme (`tools/fake_voice.py`)
  geprüft und gerendert. Mit der echten Stimme weiter bei RUNBOOK Schritt 4 (Flow „Nora und die Langeweile – drei Videos (je Hauptteil + Hook)“,
  https://elevenlabs.io/app/flows/znyBmPIQ8ckbodfYXskz, ist schon angelegt, aber leer bis auf einen fehlgeschlagenen Hook-Versuch).
- Thema: Langeweile im vollen Kinderzimmer. Unten liegen die Dinge (Bausteine, Stifte, Kuscheltiere, ein leerer Karton),
  darüber ist ein Platz leer: eine Idee, ein Spiel, das die Dinge verbindet. Langeweile heißt: Unten ist alles da, oben ist es leer.
  Jeder Vorschlag („Spiel doch mit deinen Bausteinen!“) ist nur noch ein Ding von unten und füllt oben nichts; darum sagt das Kind
  Nö, nicht aus Trotz. Die Idee wächst, wenn die Langeweile sein darf, oft aus einem kleinen Ding unten.
- Beispiel (selbst gewählt): Nora ist sechs. Es regnet, ihr Zimmer ist voll. „Mama, mir ist so langweilig!“ „Spiel doch mit deinen
  Bausteinen!“ „Nö.“ „Dann mal doch was!“ „Nö.“ „Und deine Kuscheltiere?“ „Langweilig.“ Mama hört auf vorzuschlagen: „Langweilig
  ist okay. Mal sehen, was dir einfällt.“ Nora liegt auf dem Boden, neben ihr der Igel, umgekippt: „Der Igel ist krank!“ Aus dem
  Karton wird eine Tierklinik, die Stifte schreiben Rezepte, die Kuscheltiere sind Patienten. Zwei Stunden lang.
- Einsicht in Knoten (in allen drei Videos gleich): unten vier Knoten „Bausteine“, „Stifte“, „Karton“, „Kuscheltiere“, jeweils mit
  einem gepunkteten Faden zum echten Ding auf dem Boden; oben ein leerer Platz „Idee?“. Später rastet oben „Tierklinik“ (Herz)
  ein, Goldfäden zu allen vier, und die Knoten bekommen ihre neue Rolle: „Klinik“ (Karton), „Rezepte“ (Stifte), „Patienten“
  (Kuscheltiere).
- Wiedererkennung: dasselbe Kinderzimmer am Regentag (Fenster mit Regenwolke, Bücherregal, Bausteine A B C, zwei Stifte, Karton,
  Plüsch-Pinguin und Plüsch-Igel), Nora (rote Haare mit Pferdeschwanz, rosa Shirt), Mama (Dutt, hellblaues Shirt).
- Neu in der Engine: Icons `carton` (leerer Karton mit offenen Klappen, `text`, `heart` für die Tierklinik), `blocks` (drei
  Bauklötze mit Buchstaben), `plaster` (Pflaster), `rot` für `hedgehog` und `penguin` (umgekippt).
- Noras Sätze spricht Martins Stimme (Kinderstimmen sperrt ElevenLabs); Zitate stehen in Blasen.
- Dieses Video erzählt aus Noras Sicht (ihr Satz zuerst).
- CTA: Folge-CTA: „Folg mir, wenn dein Kind auch im vollen Zimmer Langeweile hat.“
- Rehooks aus dem Katalog: Lock-In mit offener Schleife Nr. 2 („Merk dir das. Das wird gleich wichtig.“, aufgelöst mit „Das Zimmer
  war nie zu leer. Oben war es leer.“), Rehook 1 Nr. 10 („Aber genau da liegt das Problem.“), Rehook 2 Nr. 19 („Und dann ist
  Folgendes passiert:“).

## Erste 3 Sekunden

Nahaufnahme auf Nora vor dem Regal, die mit den Schultern zuckt; ihre Blase „Mama, mir ist so *langweilig*!“ steht sofort da;
Karton, Pinguin und Igel liegen schon im Bild. Ab 1,3 s fährt die Kamera zurück ins Kinderzimmer.

## Hook

| Typ | Audio | Text-Karte |
| --- | --- | --- |
| Kinderzitat | „Mama, mir ist so langweilig!“ | Volles Zimmer. / *Kein Spiel.* |

## Skript (Hauptteil bis zur Frage, 192 Wörter)

**Lock-In**
Das ruft Nora. Sie ist sechs. Draußen regnet es, ihr Zimmer ist voll mit Spielsachen. Mama sagt: „Spiel doch mit deinen Bausteinen!“ „Nö.“ „Dann mal doch was!“ „Nö.“ „Und deine Kuscheltiere?“ „Langweilig.“ Ein volles Zimmer, und nichts zu tun. Merk dir das. Das wird gleich wichtig.

> Bild: Kinderzimmer am Regentag. Pille „Nora, sechs“, Pille „voll mit Spielsachen“; Mamas Blasen und Noras „Nö.“-Blasen im
> Wechsel, „*Langweilig.*“; Karte „volles Zimmer, *nichts* zu tun“; Glühbirne und Pille „Merk dir das!“.

**Block 1**
Schau dir das als Knoten an. Unten liegen die Dinge: Bausteine, Stifte, Kuscheltiere, ein leerer Karton. Aber darüber ist ein Platz leer. Dort gehört eine Idee hin, die die Dinge verbindet. Ohne Idee ist jedes Ding nur ein Ding.

> Bild: Knoten: unten „Bausteine“, „Stifte“, „Karton“, „Kuscheltiere“ mit Fäden zu den Dingen am Boden; oben leerer Platz „Idee?“,
> der wackelt; gestrichelte Pfeile von oben zu allen vier („die die Dinge verbindet“); bei „nur ein Ding“ werden die vier blass.

**Rehook 1**
Aber genau da liegt das Problem.

> Bild: Rufzeichen in der Mitte.

**Block 2**
Mamas Vorschläge kommen alle von unten: noch ein Ding. Aber das füllt den leeren Platz oben nicht. Darum sagt Nora Nö. Also hört Mama auf und sagt: „Langweilig ist okay. Mal sehen, was dir einfällt.“

> Bild: Moll. Rote Pfeile von Mamas Hand zu den unteren Knoten, Pille „noch ein Ding“; roter Pfeil nach oben mit Kreuz, der leere
> Platz wackelt; Noras Blase „Nö.“; Mamas Blase „Langweilig ist *okay*. Mal sehen, was dir einfällt.“

**Rehook 2**
Und dann ist Folgendes passiert:

> Bild: Uhr, Pille „und dann …“.

**Block 3**
Nora liegt auf dem Boden, neben ihr der Igel, umgekippt. „Der Igel ist krank!“ Oben rastet eine Idee ein: Tierklinik. Und plötzlich hat jedes Ding einen Platz. Der Karton wird die Klinik, die Stifte schreiben Rezepte, die Kuscheltiere sind Patienten. Zwei Stunden lang. Das Zimmer war nie zu leer. Oben war es leer.

> Bild: Nora sitzt am Boden, der Igel liegt umgekippt neben ihr; Blase „Der Igel ist *krank*!“, ein Pflaster auf dem Igel. Oben
> rastet „Tierklinik“ (Herz) golden ein, Goldfäden zu allen vier Knoten; „Klinik“ (Karton), „Rezepte“ (Stifte), „Patienten“
> (Kuscheltiere) leuchten golden; der Karton trägt jetzt Herz und „Tierklinik“, Zettel „Rezept: *kuscheln*“; Pille „zwei Stunden
> lang“, Karte „Das Zimmer war nie leer. *Oben* war es leer.“

**Closing-Frage**
Was hat dein Kind zuletzt aus Langeweile erfunden?

> Bild: Hinaus ins Weltall, Fragekarte Wort für Wort, Endkarte „Folg mir“.

**CTA**
Folg mir, wenn dein Kind auch im vollen Zimmer Langeweile hat.

## Dateien

- `out/mir-ist-so-langweilig-hook-a.mp4` (nicht im Repo, entsteht nach der Stimme)
