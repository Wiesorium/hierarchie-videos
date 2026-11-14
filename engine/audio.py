"""Paper music and sound effects, synthesised in code, plus the final mix at -14 LUFS.

The music follows the brand guide: soft pads in D major that change chord with the scenes,
darker minor chords where something does not fit, music box / marimba / bells for single moments,
a quiet shaker pulse, paper and wood sounds, and a soft kick under every hit.
"""
import numpy as np

SR = 44100
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
CHORDS = {  # root, quality
    'D': ('D', 'maj'), 'G': ('G', 'maj'), 'A': ('A', 'maj'), 'Bm': ('B', 'min'), 'Em': ('E', 'min'), 'F#m': ('F#', 'min'),
}
MAJOR_CYCLE = ['D', 'G', 'Bm', 'A']
MINOR_CYCLE = ['Bm', 'Em', 'F#m']


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def chord_midis(name, octave=4):
    root, q = CHORDS.get(name, CHORDS['D'])
    r = 12 * (octave + 1) + NOTE[root]
    third = 3 if q == 'min' else 4
    return [r - 12, r, r + third, r + 7, r + 12]


def onepole_lp(x, cutoff):
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def pad_voice(freq, n, rng):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        ph = rng.random() * 6.28
        f = freq * (1 + det)
        out += np.sin(2 * np.pi * f * t + ph) + 0.18 * np.sin(4 * np.pi * f * t + ph)
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.17 * t + rng.random() * 6.28)
    return out * lfo / 3.0


def adsr(n, a=0.9, r=1.2):
    env = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na = min(na, n // 2); nr = min(nr, n // 2)
    env[:na] = np.linspace(0, 1, na) ** 1.5
    env[n - nr:] *= np.linspace(1, 0, nr) ** 1.2
    return env


def pluck(freq, dur=1.4, kind='musicbox', rng=None):
    n = int(dur * SR); t = np.arange(n) / SR
    if kind == 'marimba':
        y = np.sin(2 * np.pi * freq * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 18)
    elif kind == 'bell':
        y = sum(a * np.sin(2 * np.pi * freq * m * t) * np.exp(-t * d) for m, a, d in [(1, 1, 2.2), (2.76, 0.45, 3.5), (5.4, 0.25, 6), (8.9, 0.1, 9)])
    else:  # music box
        y = np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.2) + 0.3 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-t * 9)
    y[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return y


def noise(n, rng):
    return rng.standard_normal(n)


def sfx(kind, rng):
    if kind == 'pop':
        n = int(0.09 * SR); t = np.arange(n) / SR
        f = 520 + 900 * t / t[-1]
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.6
    if kind == 'click':  # wood
        n = int(0.07 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 1250 * t) * np.exp(-t * 90) + 0.4 * np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 140)) * 0.7
    if kind == 'rustle':
        n = int(0.42 * SR); t = np.arange(n) / SR
        x = noise(n, rng); x = x - onepole_lp(x, 1800)
        return x * np.sin(np.pi * t / t[-1]) ** 2 * 0.16
    if kind == 'boing':
        n = int(0.5 * SR); t = np.arange(n) / SR
        f = 330 * np.exp(-t * 2.2) + 120 + 14 * np.sin(2 * np.pi * 11 * t)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.5
    if kind == 'stamp':
        n = int(0.16 * SR); t = np.arange(n) / SR
        x = onepole_lp(noise(n, rng), 900)
        return (x * 3 + np.sin(2 * np.pi * 90 * t)) * np.exp(-t * 26) * 0.5
    if kind == 'kick':
        n = int(0.32 * SR); t = np.arange(n) / SR
        f = 45 + 75 * np.exp(-t * 28)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * 0.9
    if kind == 'whoosh':
        n = int(0.6 * SR); t = np.arange(n) / SR
        x = noise(n, rng); x = onepole_lp(x, 2500) - onepole_lp(x, 300)
        return x * np.sin(np.pi * t / t[-1]) ** 2 * 0.35
    raise ValueError(kind)


def place(buf, y, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(y) <= 0:
        return
    a, b = max(0, i), min(len(buf), i + len(y))
    buf[a:b] += y[a - i:b - i] * gain


def build_music(total, sections, hits, events, zoom_in, zoom_out, seed=1):
    """sections: [(t, chord)], hits: [t], events: [(t, kind)], zoom_in: (t0, t1), zoom_out: (t0, t1) in seconds."""
    rng = np.random.default_rng(seed)
    n = int(total * SR) + SR
    pad = np.zeros(n)
    secs = sorted(sections) + [(total + 1.5, None)]
    for (t0, ch), (t1, _) in zip(secs[:-1], secs[1:]):
        a = max(0, t0 - 0.4); b = min(total + 1.5, t1 + 0.9)
        m = int((b - a) * SR)
        if m <= 0:
            continue
        seg = np.zeros(m)
        for k, mid in enumerate(chord_midis(ch, 4)):
            seg += pad_voice(midi_hz(mid), m, rng) * (0.55 if k == 0 else 0.35)
        seg *= adsr(m, 0.8, 1.1)
        place(pad, seg, a, 1.0)
    pad = onepole_lp(pad, 1400) * 0.22
    mel = np.zeros(n)
    # shaker pulse at 92 bpm eighths
    step = 60 / 92 / 2
    sh = sfx('rustle', rng)[: int(0.05 * SR)] * 0.5
    t = zoom_in[1] + 0.2
    while t < (zoom_out[0] if zoom_out else total):
        place(mel, sh, t, 0.18 if int(t / step) % 2 else 0.1)
        t += step

    def chord_at(tt):
        c = secs[0][1]
        for t0, chn in secs[:-1]:
            if t0 <= tt:
                c = chn
        return c
    for i, h in enumerate(hits):
        ch = chord_at(h)
        notes = chord_midis(ch, 5)[1:]
        kind = ['musicbox', 'marimba', 'bell'][i % 3]
        place(mel, pluck(midi_hz(notes[i % len(notes)]), kind=kind), h, 0.32)
        place(mel, sfx('kick', rng), h, 0.42)
    for t_ev, kind in events:
        g = {'pop': 0.26, 'click': 0.32, 'rustle': 0.5, 'boing': 0.3, 'stamp': 0.42, 'whoosh': 0.35, 'bell': 0.25}.get(kind, 0.3)
        if kind == 'bell':
            place(mel, pluck(midi_hz(chord_midis(chord_at(t_ev), 5)[2]), kind='bell'), t_ev, g)
        else:
            place(mel, sfx(kind, rng), t_ev, g)
    # descending glissando into the scene, rising tones out into the universe
    for (t0, t1), up in ((zoom_in, False), (zoom_out, True)):
        if not t0 and not t1:
            continue
        notes = [74, 78, 81, 86, 90, 93] if up else [93, 90, 86, 81, 78, 74]
        for k, mnote in enumerate(notes):
            place(mel, pluck(midi_hz(mnote), 1.6, 'musicbox'), t0 + (t1 - t0) * k / len(notes), 0.2)
        place(mel, sfx('whoosh', rng), t0, 0.5)
    return pad, mel


def duck_curve(voice, total_n):
    env = np.zeros(total_n)
    v = np.abs(voice[:total_n])
    win = int(0.08 * SR)
    k = np.ones(win) / win
    e = np.convolve(v, k, mode='same')
    env[: len(e)] = e
    env = env / (np.percentile(env[env > 0], 90) + 1e-9) if np.any(env > 0) else env
    env = np.clip(env, 0, 1)
    # slow release: max-hold over 0.35 s, then smooth
    from scipy.ndimage import maximum_filter1d
    held = maximum_filter1d(env, size=int(0.35 * SR))
    return onepole_lp(held, 4.0)


def mix(voice, pad, mel, target_lufs=-14.0):
    import pyloudnorm as pyln
    n = max(len(voice), len(pad))
    v = np.zeros(n); v[: len(voice)] = voice
    p = np.zeros(n); p[: len(pad)] = pad
    m = np.zeros(n); m[: len(mel)] = mel
    d = duck_curve(v, n)
    music = (p + m) * (1 - 0.45 * d)
    out = v + music * 0.5
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(out)
    out = out * 10 ** ((target_lufs - lufs) / 20)
    # soft limiter at -1 dBFS
    ceil = 10 ** (-1 / 20)
    out = np.tanh(out / ceil) * ceil
    lufs2 = meter.integrated_loudness(out)
    out = out * 10 ** ((target_lufs - lufs2) / 20)
    out = np.clip(out, -ceil, ceil)
    return out, meter.integrated_loudness(out)
