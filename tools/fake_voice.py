#!/usr/bin/env python3
"""Test helper: make a speech-like placeholder voice and ElevenLabs-style words.json from tts.json.

Only for testing the pipeline without ElevenLabs. Usage:
  python3 tools/fake_voice.py EPISODE   (reads EPISODE/tts.json, writes EPISODE/audio/*.mp3 + words.json)
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

SR = 44100


def word_sound(word, rng):
    syll = max(1, len(re.findall(r'[aeiouäöüy]+', word.lower())))
    dur = 0.11 + 0.13 * syll
    n = int(dur * SR); t = np.arange(n) / SR
    f0 = 120 + rng.random() * 25
    y = sum(np.sin(2 * np.pi * f0 * k * t) / k for k in range(1, 9))
    env = np.zeros(n)
    for s in range(syll):
        c = (s + 0.5) / syll * dur
        env += np.exp(-((t - c) / (dur / syll / 3.2)) ** 2)
    return (y * env * 0.12).astype(np.float64), dur


def synth(text, rng):
    toks = re.findall(r'\[[^\]]+\]|\S+', text)
    out, words, t = [], [], 0.05
    out.append(np.zeros(int(0.05 * SR)))
    for tok in toks:
        if tok.startswith('['):
            if tok == '[pause]':
                out.append(np.zeros(int(0.7 * SR))); t += 0.7
            continue
        y, d = word_sound(tok, rng)
        words.append({'text': tok, 'start': round(t, 3), 'end': round(t + d, 3), 'type': 'word'})
        out.append(y); t += d
        gap = 0.32 if tok[-1] in '.!?:' else 0.14 if tok[-1] == ',' else 0.05
        out.append(np.zeros(int(gap * SR))); t += gap
        words.append({'text': ' ', 'start': round(t - gap, 3), 'end': round(t, 3), 'type': 'spacing'})
    out.append(np.zeros(int(0.3 * SR)))
    return np.concatenate(out), words


def write_mp3(y, path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '128k', str(path)], stdin=subprocess.PIPE)
    p.communicate(y.astype(np.float32).tobytes())


def main():
    ep = Path(sys.argv[1]); tts = json.loads((ep / 'tts.json').read_text())
    au = ep / 'audio'; au.mkdir(exist_ok=True)
    rng = np.random.default_rng(3)
    y, words = synth(tts['main'], rng)
    write_mp3(y, au / 'main.mp3')
    (au / 'words.json').write_text(json.dumps({'language_code': 'deu', 'text': tts['main'], 'words': words}, ensure_ascii=False))
    for v, txt in tts['hooks'].items():
        hy, _ = synth(txt, rng); write_mp3(hy, au / f'hook-{v}.mp3')
    print('ok', len(words))


if __name__ == '__main__':
    main()
