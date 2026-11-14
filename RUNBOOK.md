# Täglicher Lauf: ein Hierarchie-Video in drei Hook-Varianten

Diese Anleitung führt die geplante Aufgabe aus (täglich gegen 5 und 20 Uhr Wiener Zeit). Martin ist dabei nicht
anwesend: Nicht nachfragen, sondern die vernünftigste Entscheidung treffen und sie am Ende in einem Satz nennen.
Am Ende steht immer eine Nachricht an Martin mit `SendUserMessage`, auch wenn etwas schiefging.

Martin hat entschieden (14.11.2026): Thema aus der Ideenliste, wenn die leer ist, wählt der Lauf selbst eine
Alltagssituation mit Familie oder Freunden. Ein Lauf läuft ohne Freigaben durch: Skript → Stimme → Video.

## 0. Vorbereiten (2 Minuten)

1. Repo holen: `add_repo` mit `Wiesorium/hierarchie-videos` und `access: "push"`, dann die Clone-Anweisung aus dem Ergebnis
   ausführen und danach `bash setup.sh`.
2. Netz prüfen, **bevor** Credits ausgegeben werden:
   `curl -sS -m 20 -o /dev/null -w "%{http_code}\n" https://elevenlabsusercontent.com/` – eine Zahl wie 403/404 heißt erreichbar.
   `000` mit „CONNECT tunnel failed“ heißt gesperrt. Dann **keine Stimme erzeugen**: Skript und Storyboard trotzdem schreiben,
   committen (Status „wartet auf Freigabe“ in `state/episodes.json`) und Martin schreiben, dass `elevenlabsusercontent.com`
   auf claude.ai unter Einstellungen → Capabilities als erlaubte Domain fehlt. Lauf beenden.
3. `STYLE.md` und `STORYBOARD.md` lesen. Im Produktions-Doc (Claude Docs, Projekt `a83f7a69-31ce-4e4b-a050-9b71528447a9`)
   die Abschnitte „Arbeitsweise“ und „Feste Vorgaben“ lesen (`mcp__Claude_Docs__read` mit
   `{"kind": "search", "blocks": {"first": "mvv29m4cc9a.57", "last": "mvv29m4cc9a.220848"}}` auf Knoten `51a3d00d-1e64`).
   Steht dort etwas Neueres als in STYLE.md, gilt das Doc.

## 1. Thema wählen

- `state/ideas.json`: die erste Idee mit `"status": "offen"`. Ihr Beispiel nutzen, wenn eines dasteht; sonst ein eigenes
  konkretes Alltagsbeispiel mit Familie oder Freunden erfinden (Namen und Alter, eine Szene, die jeder kennt).
- Ist keine Idee offen: selbst ein Thema wählen, das in `state/episodes.json` noch nicht vorkommt, mit Familie oder Freunden,
  das sich gut als „unten/oben im Schrank“ zeigen lässt (Schule, Lernen, Gewohnheiten, Streit, Neugier, Essen, Spielen).
- CTA: Eltern-, Kinder-, Schulthemen → `whatsapp`; Erwachsenen- und Selbstreflexionsthemen → `kurs`.
- Episode-Ordner anlegen: `episodes/JJJJ-MM-TT-morgen-<slug>` oder `…-abend-<slug>` (Uhrzeit des Laufs).

## 2. Skript schreiben

Nach dem Script-Guide in STYLE.md: drei Hooks (je ein Satz, verschiedene Winkel: Situation, Umdeutung, Zitat/Zahl), Lock-In,
Block 1, Rehook 1, Block 2, Rehook 2, Block 3 (optional), Closing-Frage, CTA. Hauptteil 150–210 Wörter.
Zahlen im Hauptteil als Wort schreiben („zehn“). In `script.md` im Episode-Ordner ablegen (Hooks, Skript, Bildideen je Abschnitt).
Vor dem Weitermachen gegenlesen: einfach, warm, urteilt nicht, ein konkretes Beispiel, die Einsicht in Knoten erklärbar.

## 3. Storyboard bauen

`storyboard.json` nach STORYBOARD.md, das Beispiel `episodes/_beispiel-das-abgemalte-zeichen/storyboard.json` als Vorlage.
Vier bis fünf Szenen: Szene der Geschichte → Knoten/Schrank mit der Einsicht → (Moll-Szene beim Problem) → Auflösung.
Acht Treffer auf Schlüsselwörtern. Anker sind Wortfolgen aus dem Skript, ohne Zahlen.
Dann `python3 engine/build.py <EP> tts` – schreibt `tts.json` mit den genauen Texten für die Stimme.

## 4. Stimme erzeugen (ElevenLabs-Connector `mcp__ElevenLabs__*`)

Genau ein Take pro Text (`generations_count: 1`), nie einen Aufruf wiederholen (jeder kostet Credits).

1. `creative_create_flow` mit Namen „<Titel> – Hauptteil + 3 Hooks“.
2. `creative_generate_speech` viermal auf diesem Flow: `prompt` = `tts.json` → `main`, `hooks.a`, `hooks.b`, `hooks.c`;
   `voice_id: "xJgIGF3FqMGNm9nOnrvZ"`, `model_id: "eleven_v4"`, `generations_count: 1`.
3. `creative_get_flow_run_status` mit allen session_ids, bis alles fertig ist (zwischendurch 20–30 s warten).
   Die Download-URLs mit `curl -sS -m 120 -o <EP>/audio/main.mp3 "<url>"` (und `hook-a.mp3`, `hook-b.mp3`, `hook-c.mp3`) holen.
   Mit `ffprobe` prüfen, dass jede Datei Ton hat.
4. Wortzeiten: `creative_add_flow_asset_node` (modality `audio`, generation_id des Hauptteils), dann `creative_transcribe_audio`
   mit `connect_from: [node_id]`, `model_id: "eleven_scribe_v1"`. Mit `creative_get_flow_run_status` warten. Die Wörter
   (`transcripts[0].words` mit text/start/end, oder die Datei hinter `words_download_url`) als
   `<EP>/audio/words.json` im Format `{"words": [{"text", "start", "end", "type": "word"}]}` speichern.
5. Reichen die Credits nicht (Fehlermeldung), nichts erzwingen: Martin schreiben, wie viele fehlen, Lauf beenden.

## 5. Prüfen und rendern

1. `python3 engine/build.py <EP> check` – meldet fehlende Anker mit Vorschlägen. Anker anpassen, bis es durchläuft.
2. Das Kontaktblatt `<EP>/qa/contact-a.png` mit Read ansehen. Auf Überlappungen, abgeschnittene Texte, leere Bilder,
   Elemente im oberen Bereich (y < 450) achten und das Storyboard korrigieren. Bei Bedarf einzelne Bilder rendern:
   `node engine/render.mjs <EP>/work/resolved-a.json --variant a --png 300,900 --out <EP>/qa/stills`.
3. `python3 engine/build.py <EP> render` – rendert alle drei Varianten (etwa 1–2 Minuten). Im Bericht prüfen:
   drei Dateien, je mit Video und Audio, Lautheit −14 LUFS (±0,5), Dauer 50–100 s.
4. Aus einer fertigen MP4 sechs Bilder ziehen und ansehen
   (`ffmpeg -i <mp4> -vf "fps=1/12,scale=270:480,tile=6x1" -frames:v 1 <EP>/qa/final.png`).

## 6. Captions

`<EP>/captions.json` schreiben (`titel`, `cta`, `instagram`, `youtube_titel`, `youtube_beschreibung`, `linkedin`, `tiktok`)
nach den Regeln in STYLE.md, dann `python3 tools/add_caption.py <EP>`.

## 7. Liefern und festhalten

1. `SendUserFile` mit den drei MP4s (`display: "attach"`, `status: "proactive"`) und einer Zeile Kontext.
2. Google Drive: `captions.md` in den Ordner „Hierarchie-Videos“ (ID `1vuUTAMKfdyS9zqHCiM_xE3WyDc8lckOO`) hochladen
   (`mcp__Google_Drive__create_file`, `textContent`, Titel `<datum>-<slug>-captions`). Die Videos selbst passen nicht durch
   den Drive-Connector (Grenze etwa 3 MB pro Aufruf); sie liegen im Lauf.
3. Produktions-Doc: am Ende einen Abschnitt `## Fertig (automatisch): <Titel>` anfügen mit Datum, Thema/Idee, CTA, den drei
   Hooks, dem Skript und den Dateinamen (Docs-Tool `update`, `insert` mit `{"kind": "root"}`, `"side": "end"`).
4. `state/ideas.json`: genutzte Idee auf `"status": "erledigt"` mit Datum setzen. `state/episodes.json`: Eintrag oben anfügen
   (datum, slot morgen/abend, slug, titel, idee, cta, hooks, dauer, flow_url).
5. Committen und pushen (Storyboard, Skript, tts.json, captions, words.json, state – keine MP3/MP4):
   `git add -A && git commit -m "Video: <Titel>" && git -c push.negotiate=true push origin main`.
6. Zum Schluss `SendUserMessage` an Martin: Titel, welches Thema/Beispiel, die drei Hooks, die Instagram-Caption, was
   selbst entschieden wurde und ob etwas fehlt.

## Wenn etwas schiefgeht

- Render-Fehler: Fehlermeldung lesen, Storyboard korrigieren (meist ein unbekannter Typ, eine Requisite oder ein Anker), neu starten.
- Engine-Fehler, der sich nicht über das Storyboard lösen lässt: im Engine-Code beheben, testen, mit eigenem Commit
  („Engine: …“) pushen und Martin in der Schlussnachricht erwähnen.
- Ein Schritt bleibt hängen: nicht endlos versuchen. Was fertig ist, committen, und Martin sagen, was fehlt.
