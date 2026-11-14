# Hierarchie-Videos

Bauplan für Martins tägliche Hierarchologie-Reels (Kanal hierarchologie): Skript → ElevenLabs-Stimme → Pastell-Animation
in Code → drei Hook-Varianten als MP4.

- `RUNBOOK.md` – der tägliche Ablauf, den die geplante Aufgabe ausführt
- `STYLE.md` – Stil, Script-Guide, CTA und Captions in Kurzform
- `STORYBOARD.md` – das Format, in dem jedes Video beschrieben wird
- `engine/` – Renderer (Node + @napi-rs/canvas), Musik und Mischung (Python), `build.py` als Einstieg
- `state/` – Ideen-Warteschlange, Liste der fertigen Videos, alle Captions
- `episodes/` – ein Ordner pro Video (Storyboard, Skript, Wortzeiten, Captions)

Schnelltest ohne ElevenLabs:

```
bash setup.sh
python3 engine/build.py episodes/_beispiel-das-abgemalte-zeichen tts
python3 tools/fake_voice.py episodes/_beispiel-das-abgemalte-zeichen
python3 engine/build.py episodes/_beispiel-das-abgemalte-zeichen render
```
