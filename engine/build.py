#!/usr/bin/env python3
"""Build a Hierarchologie reel from an episode folder.

  python3 engine/build.py EPISODE tts       -> writes EPISODE/tts.json (exact texts for ElevenLabs)
  python3 engine/build.py EPISODE check     -> validates storyboard + anchors, renders a contact sheet
  python3 engine/build.py EPISODE render    -> renders all variants to EPISODE/out/<slug>-hook-<v>.mp4

EPISODE contains storyboard.json and audio/ (main.mp3, hook-a.mp3, hook-b.mp3, hook-c.mp3, words.json).
See STORYBOARD.md for the format.
"""
import json, math, os, re, subprocess, sys, shutil, difflib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'engine'))
import audio as A  # noqa: E402

FPS = 30
HOOK_PAUSE = 0.45
GROUND_Y = 1478  # figures and floor props stand here when they have no y (engine/lib/core.mjs GROUND)
TYPES = {'figure', 'prop', 'cabinet', 'tree', 'node', 'link', 'arrow', 'card', 'bubble', 'thought', 'stamp', 'tag', 'icon'}
PROP_KINDS = {'table', 'chair', 'desk', 'blackboard', 'notebook', 'phone', 'book', 'cup', 'plate', 'clock', 'sofa', 'tree', 'bench', 'door',
              'window', 'bed', 'car', 'laptop', 'ball', 'backpack', 'shelf', 'sign', 'tv', 'stars', 'pot',
              'fridge', 'bowl', 'bottle', 'cushions', 'casserole', 'salt', 'paper', 'sink', 'box', 'block', 'pool'}
ICONS = {'bulb', 'check', 'cross', 'question', 'exclaim', 'heart', 'star', 'moon', 'sun', 'clock', 'magnifier', 'balloon', 'plane', 'house', 'book',
         'pencil', 'cloud', 'rain', 'zzz', 'note', 'hedgehog', 'planet', 'pluto', 'lemon', 'bottle', 'cashew', 'salt', 'spoon', 'toothbrush',
         'penguin', 'bird', 'bat', 'feather', 'scarf', 'gift', 'yarn', 'pyjama', 'carton', 'blocks', 'plaster'}
ROLES = {'mama', 'papa', 'woman', 'man', 'oma', 'opa', 'teacher', 'girl', 'boy', 'teen', 'toddler'}
MOODS = {'smile', 'happy', 'grin', 'laugh', 'open', 'wow', 'sad', 'worried', 'scared', 'neutral'}
GESTURES = {'wave', 'point', 'cheer', 'raise', 'shrug', 'think', 'hug'}
STATES = {'normal', 'empty', 'glow', 'gold', 'check', 'cross', 'question', 'shake', 'pulse', 'dim', 'heavy', 'open', 'red'}
CHORDS = set(A.CHORDS)


class StoryError(Exception):
    pass


# ---------------- audio helpers ----------------
def speech_span(wav, sr=A.SR):
    """(start, end) of the audible speech in seconds: first/last 10-ms window louder than -32 dB below the loud parts."""
    hop = sr // 100
    n = len(wav) // hop
    if n == 0:
        return 0.0, len(wav) / sr
    rms = np.sqrt(np.mean(wav[: n * hop].reshape(n, hop) ** 2, axis=1))
    thr = np.percentile(rms, 95) * 10 ** (-32 / 20)
    on = np.nonzero(rms > thr)[0]
    if not len(on):
        return 0.0, len(wav) / sr
    return on[0] * hop / sr, (on[-1] + 1) * hop / sr


def decode(path, sr=A.SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


# ---------------- words & anchors ----------------
PUNCT = re.compile(r"[„“”\"'‚‘’«».,!?;:()\[\]…–—-]")


def norm(w):
    return PUNCT.sub('', w.lower()).strip()


def load_words(path):
    J = json.loads(Path(path).read_text())
    W = J['words'] if isinstance(J, dict) and 'words' in J else J
    out = []
    for w in W:
        if w.get('type', 'word') != 'word':
            continue
        txt = str(w.get('text', '')).strip()
        if not txt or txt.startswith('['):
            continue
        n = norm(txt)
        if not n:
            continue
        out.append({'w': txt, 'n': n, 's': float(w['start']), 'e': float(w['end'])})
    if not out:
        raise StoryError(f'Keine Wörter in {path}')
    return out


ANCH = re.compile(r'^(?P<end>end:)?(?P<phrase>.*?)(?:#(?P<occ>\d+))?(?:(?P<off>[+-]\d+(?:\.\d+)?)s?)?$')


class Resolver:
    def __init__(self, words, main_dur):
        self.words = words
        self.toks = [w['n'] for w in words]
        self.main_dur = main_dur
        self.missing = []

    def find(self, phrase, after=-1e9):
        q = [norm(x) for x in phrase.split() if norm(x)]
        if not q:
            return None
        hits = []
        for i in range(len(self.toks) - len(q) + 1):
            if self.toks[i:i + len(q)] == q and self.words[i]['s'] >= after - 0.02:
                hits.append(i)
        return hits, len(q)

    def __call__(self, a, after=-1e9, default=None, where=''):
        if a is None:
            return default
        if isinstance(a, (int, float)):
            return float(a)
        a = str(a).strip()
        if a == 'start':
            return 0.0
        if a in ('hookstart', 'always'):
            return -999.0
        if a in ('end', 'never'):
            return self.main_dur + 30
        if a.startswith('@'):
            return float(a[1:].rstrip('s'))
        m = ANCH.match(a)
        phrase, occ, off = m.group('phrase').strip(), int(m.group('occ') or 1), float(m.group('off') or 0)
        res = self.find(phrase, after)
        if not res or len(res[0]) < occ:
            # fall back to a search over the whole text before giving up
            res2 = self.find(phrase, -1e9)
            if res2 and len(res2[0]) >= occ and after > -1e8:
                i = res2[0][occ - 1]
            else:
                self.missing.append((a, where, self.suggest(phrase)))
                return default if default is not None else 0.0
        else:
            i = res[0][occ - 1]
        n = res[1] if res else len(phrase.split())
        t = self.words[i + n - 1]['e'] if m.group('end') else self.words[i]['s']
        return t + off

    def suggest(self, phrase):
        q = ' '.join(norm(x) for x in phrase.split())
        k = max(1, len(q.split()))
        grams = [' '.join(self.toks[i:i + k]) for i in range(len(self.toks) - k + 1)]
        return difflib.get_close_matches(q, grams, n=3, cutoff=0.5)


# ---------------- storyboard ----------------
def tts_texts(sb):
    s = sb['script']
    order = ['lockin', 'block1', 'rehook1', 'block2', 'rehook2', 'block3', 'closing']
    parts = [s[k].strip() for k in order if s.get(k)]
    main = '[warmly] ' + ' [pause] '.join(parts) + ' [pause] [pause] ' + s['cta'].strip()
    hooks = {v: '[warmly] ' + h['audio'].strip() for v, h in sb['hooks'].items()}
    return {'main': main, 'hooks': hooks, 'voice_id': 'xJgIGF3FqMGNm9nOnrvZ', 'model_id': 'eleven_v4'}


def validate_static(sb):
    errs = []
    for k in ('slug', 'title', 'cta', 'hooks', 'script', 'question', 'scenes', 'hits'):
        if k not in sb:
            errs.append(f'Feld fehlt: {k}')
    if errs:
        raise StoryError('\n'.join(errs))
    if sb['cta'] not in ('whatsapp', 'kurs', 'follow'):
        errs.append('cta muss whatsapp, kurs oder follow sein')
    for k in ('lockin', 'block1', 'closing', 'cta'):
        if not sb['script'].get(k):
            errs.append(f'script.{k} fehlt')
    if set(sb['hooks']) - {'a', 'b', 'c'} or not sb['hooks']:
        errs.append('hooks: a, b, c erwartet')
    for v, h in sb['hooks'].items():
        if not h.get('audio') or not h.get('card') or len(h['card']) > 2:
            errs.append(f'hook {v}: audio und card (1-2 Zeilen) nötig')
    ids = set()
    for si, sc in enumerate(sb['scenes']):
        if sc.get('chord') and sc['chord'] not in CHORDS:
            errs.append(f'Szene {si}: chord {sc["chord"]} unbekannt ({", ".join(sorted(CHORDS))})')
        for e in sc.get('elements', []):
            t = e.get('type'); where = f'Szene {si}, Element {e.get("id")}'
            if not e.get('id'):
                errs.append(f'Szene {si}: Element ohne id ({t})')
            if t not in TYPES:
                errs.append(f'{where}: Typ {t} unbekannt')
            if t == 'prop' and e.get('kind') not in PROP_KINDS:
                errs.append(f'{where}: Requisite {e.get("kind")} unbekannt ({", ".join(sorted(PROP_KINDS))})')
            if t == 'icon' and e.get('kind') not in ICONS:
                errs.append(f'{where}: Icon {e.get("kind")} unbekannt ({", ".join(sorted(ICONS))})')
            if t == 'figure':
                if e.get('role') not in ROLES:
                    errs.append(f'{where}: Rolle {e.get("role")} unbekannt ({", ".join(sorted(ROLES))})')
                for mm in [e.get('mood')] + [m.get('mood') for m in e.get('moods', [])]:
                    if mm and mm not in MOODS:
                        errs.append(f'{where}: Stimmung {mm} unbekannt ({", ".join(sorted(MOODS))})')
                for g in e.get('gestures', []):
                    if g.get('kind') not in GESTURES:
                        errs.append(f'{where}: Geste {g.get("kind")} unbekannt ({", ".join(sorted(GESTURES))})')
            states = []
            if t == 'cabinet':
                for did, d in (e.get('drawers') or {}).items():
                    states += [s.get('state') for s in d.get('states', [])]
                listed = {x for row in e.get('rows', []) for x in row}
                for did in listed:
                    if did not in (e.get('drawers') or {}):
                        errs.append(f'{where}: Schublade {did} steht in rows, fehlt aber in drawers')
            if t == 'tree':
                for lvl in e.get('levels', []):
                    for n in lvl:
                        states += [s.get('state') for s in n.get('states', [])]
            if t == 'node':
                states += [s.get('state') for s in e.get('states', [])]
            for st in states:
                for part in str(st).split('+'):
                    if part not in STATES:
                        errs.append(f'{where}: Zustand {part} unbekannt ({", ".join(sorted(STATES))})')
            ids.add(e.get('id'))
    if errs:
        raise StoryError('\n'.join(errs))


def resolve(ep, sb, words, main_dur, hook_durs, hook_spans=None):
    R = Resolver(words, main_dur)
    s = sb['script']
    # closing and CTA in the transcript
    def first_words(txt, k=3):
        return ' '.join(txt.split()[:k])
    closing_t = R(first_words(s['closing']), after=main_dur * 0.4, where='script.closing')
    cta_t = R(first_words(s['cta']), after=closing_t, where='script.cta')
    ci = next(i for i, w in enumerate(words) if w['s'] >= closing_t - 0.02)
    ki = next((i for i, w in enumerate(words) if w['s'] >= cta_t - 0.02), len(words))
    closing_words = words[ci:ki]
    before_close = words[ci - 1]['e'] if ci > 0 else closing_t - 0.5

    # scenes
    scenes = sb['scenes']
    starts = []
    for si, sc in enumerate(scenes):
        t = 0.0 if si == 0 else R(sc.get('at'), after=starts[-1] if starts else 0, where=f'Szene {si}.at')
        starts.append(t)
    ends = starts[1:] + [main_dur + 30]
    events = []  # (main time, sfx)
    merged = {}
    order = []

    def T(a, after, default, where):
        return R(a, after=after, default=default, where=where)

    for si, sc in enumerate(scenes):
        S0 = starts[si]
        sstart = -999.0 if si == 0 else S0
        if si > 0:
            events.append((S0, 'rustle'))
        for e in sc.get('elements', []):
            e = json.loads(json.dumps(e))
            eid = e['id']; where = f'Szene {si}/{eid}'
            tin = T(e.get('in'), S0, sstart, where + '.in')
            tout = T(e.get('out'), S0, ends[si] if not e.get('keep') else main_dur + 30, where + '.out')
            if eid in merged:  # same element continues: glide to its new place
                base = merged[eid]
                base['_tout'] = max(base['_tout'], tout)
                y0 = base.get('y', GROUND_Y if base['type'] in ('figure', 'prop') else 0)
                dx, dy = e.get('x', base.get('x', 0)) - base.get('x', 0), e.get('y', y0) - y0
                base.setdefault('_moves', []).append({'t': S0, 'dx': dx, 'dy': dy, 'dur': e.get('glide', 0.8)})
                if e.get('mood'):
                    base.setdefault('_moods', []).append({'t': S0, 'mood': e['mood']})
                tgt = base
            else:
                e['_tin'], e['_tout'] = tin, tout
                merged[eid] = e; order.append(eid); tgt = e
                if tin > -50:
                    events.append((tin, {'bubble': 'pop', 'thought': 'pop', 'card': 'pop', 'tag': 'pop', 'icon': 'pop', 'node': 'pop', 'stamp': 'stamp',
                                         'cabinet': 'click', 'tree': 'pop', 'figure': 'rustle', 'link': None, 'arrow': None, 'prop': None}.get(e['type'])))
            src = e
            for m in src.get('moods', []):
                tgt.setdefault('_moods', []).append({'t': T(m['at'], S0, S0, where + '.moods'), 'mood': m['mood']})
            for g in src.get('gestures', []):
                tgt.setdefault('_gestures', []).append({'t': T(g['at'], S0, S0, where + '.gestures'), 'kind': g['kind'], 'dur': g.get('dur', 1.4)})
            for mv in src.get('moves', []):
                bx, by = tgt.get('x', 0), tgt.get('y', GROUND_Y if tgt['type'] in ('figure', 'prop') else 0)
                mm = {'t': T(mv['at'], S0, S0, where + '.moves'), 'dx': mv.get('x', bx) - bx, 'dy': mv.get('y', by) - by, 'dur': mv.get('dur', 0.8)}
                if mv.get('rot') is not None:  # props that turn while they move (block)
                    mm['rot'] = float(mv['rot'])
                tgt.setdefault('_moves', []).append(mm)
            for tk in src.get('talk', []):
                a = T(tk[0] if isinstance(tk, list) else tk['from'], S0, S0, where + '.talk')
                b = T(tk[1] if isinstance(tk, list) else tk['to'], a, a + 2, where + '.talk')
                tgt.setdefault('_talk', []).append([a, b])
            if src['type'] == 'figure' and isinstance(src.get('scarf'), dict):  # worn scarf that pops on at its anchor
                tgt['scarf'] = src['scarf']
                if src['scarf'].get('in') is not None:
                    tgt['_scarfT'] = T(src['scarf']['in'], S0, S0, where + '.scarf')
            if src.get('hop'):
                tgt['_hopT'] = T(src['hop'], S0, S0, where + '.hop')
            if src['type'] == 'node' and src.get('states'):
                tgt['_states'] = [{'t': T(x['at'], S0, S0, where + '.states'), 'state': x['state']} for x in src['states']]
            if src['type'] == 'cabinet':
                for did, d in (tgt.get('drawers') or {}).items():
                    sd = (src.get('drawers') or {}).get(did, d)
                    if sd.get('in') is not None:
                        d['_tin'] = T(sd['in'], S0, S0, f'{where}.{did}.in'); events.append((d['_tin'], 'click'))
                    d['_states'] = [{'t': T(x['at'], S0, S0, f'{where}.{did}.states'), 'state': x['state']} for x in sd.get('states', [])]
            if src['type'] == 'tree':
                for lvl in tgt.get('levels', []):
                    for n in lvl:
                        if n.get('in') is not None:
                            n['_tin'] = T(n['in'], S0, S0, f'{where}.{n["id"]}.in'); events.append((n['_tin'], 'pop'))
                        n['_states'] = [{'t': T(x['at'], S0, S0, f'{where}.{n["id"]}.states'), 'state': x['state']} for x in n.get('states', [])]
                for L in tgt.get('links', []):
                    if L.get('in') is not None:
                        L['_tin'] = T(L['in'], S0, S0, f'{where}.link.in')
            if src['type'] in ('link', 'arrow') and src.get('in') is not None:
                tgt['_tin'] = tin
            for coll in (tgt.get('_states') or []):
                pass
    elements = [merged[i] for i in order]
    # sound for state changes
    for e in elements:
        st_lists = []
        if e['type'] == 'node':
            st_lists.append(e.get('_states', []))
        if e['type'] == 'cabinet':
            st_lists += [d.get('_states', []) for d in (e.get('drawers') or {}).values()]
        if e['type'] == 'tree':
            st_lists += [n.get('_states', []) for lvl in e.get('levels', []) for n in lvl]
        for sl in st_lists:
            for x in sl:
                if 'cross' in x['state']:
                    events.append((x['t'], 'boing'))
                elif 'check' in x['state'] or 'glow' in x['state'] or 'gold' in x['state']:
                    events.append((x['t'], 'bell'))
                elif 'shake' in x['state']:
                    events.append((x['t'], 'click'))
        for m in e.get('_moves', []):
            events.append((m['t'], 'rustle'))
    hits = []
    for h in sb['hits']:
        t = R(h['at'], after=-1e9, where='hits')
        hits.append({'t': t, 'x': h.get('x', 540), 'y': h.get('y', 900), 'scale': h.get('scale', 1), 'sparks': h.get('sparks', True)})
    hits.sort(key=lambda h: h['t'])

    if R.missing:
        lines = ['Diese Anker stehen nicht im Transkript (Wörter genau wie gesprochen, ohne Satzzeichen):']
        for a, where, sug in R.missing:
            lines.append(f'  - {where}: "{a}"' + (f'  → meintest du: {" | ".join(sug)}' if sug else ''))
        raise StoryError('\n'.join(lines))

    # subtitles: everything before the closing question
    chunks, cur = [], []
    for i, w in enumerate(words[:ci]):
        cur.append({'w': w['w'], 's': w['s'], 'e': w['e']})
        endp = w['w'][-1:] in '.!?:' or (w['w'][-1:] == ',' and len(cur) >= 7) or len(cur) >= 11
        if endp:
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    subs = []
    for i, c in enumerate(chunks):
        nxt = chunks[i + 1][0]['s'] if i + 1 < len(chunks) else c[-1]['e'] + 0.6
        until = nxt if nxt - c[-1]['e'] < 0.9 else c[-1]['e'] + 0.5
        subs.append({'words': c, 's': c[0]['s'], 'until': until})
    # question card word times
    qwords = ' '.join(sb['question']).split()
    qtimes = [closing_words[min(i, len(closing_words) - 1)]['s'] if closing_words else closing_t + 0.25 * i for i in range(len(qwords))]

    first_sentence_end = next((w['e'] for w in words if w['w'][-1:] in '.!?'), 2.5)
    main_end = main_dur
    end_f = math.ceil((main_end + 1.4) * FPS)
    variants = {}
    intro = sb.get('intro') or {}
    for v, d in hook_durs.items():
        if 'gap' in intro and hook_spans and v in hook_spans:
            # no silence between hook and main part: main speech starts `gap` s after the hook's last sound
            off_f = max(round((hook_spans[v][1] + float(intro['gap']) - words[0]['s']) * FPS), round(0.3 * FPS))
        else:
            off_f = round((d + HOOK_PAUSE) * FPS)
        off = off_f / FPS
        card_end_main = min(max(first_sentence_end, 1.2), 4.0) + 0.1
        variants[v] = {'id': v, 'offset': off, 'offF': off_f, 'card': sb['hooks'][v]['card'], 'cardEnd': off + card_end_main, 'hookDur': d,
                       'cardSize': intro.get('cardSize')}
    sub_start = max(vv['cardEnd'] - vv['offset'] for vv in variants.values()) + 0.1
    K = sub_start + 0.35
    k_f = math.ceil(K * FPS)

    chords = []
    cyc = 0
    for si, sc in enumerate(scenes):
        ch = sc.get('chord')
        if not ch:
            ch = A.MAJOR_CYCLE[cyc % 4]; cyc += 1
        chords.append((starts[si] if si else 0.0, ch))
    resolved = {
        'slug': sb['slug'], 'title': sb['title'], 'cta': sb['cta'], 'endcard': sb.get('endcard'), 'hero': sb.get('hero'),
        'elements': elements, 'hits': hits, 'subtitles': subs,
        'outro': {'zoomStart': before_close + 0.05, 'zoomDur': 2.6, 'questionIn': closing_t, 'questionLines': sb['question'], 'questionTimes': qtimes,
                  'ctaIn': cta_t - 0.15, 'end': end_f / FPS},
        'variants': variants, 'tailStart': k_f / FPS, 'subStart': sub_start, 'sceneStarts': starts, 'tailF': k_f, 'endF': end_f, 'mainDur': main_dur,
        'chords': chords, 'events': [(t, k) for t, k in events if k], 'close': intro.get('close'),
    }
    return resolved


def envelope(main_wav, n_frames):
    hop = A.SR // FPS
    env = np.zeros(n_frames)
    for f in range(n_frames):
        seg = main_wav[f * hop:(f + 1) * hop]
        env[f] = np.sqrt(np.mean(seg ** 2)) if len(seg) else 0
    ref = np.percentile(env[env > 0], 92) if np.any(env > 0) else 1
    env = np.clip(env / (ref + 1e-9), 0, 1)
    env = np.convolve(env, [0.25, 0.5, 0.25], mode='same')
    return [round(float(x), 3) for x in env]


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def render_chunk(resolved_path, args, out_mp4):
    node = subprocess.Popen(['node', str(ROOT / 'engine' / 'render.mjs'), str(resolved_path)] + args, stdout=subprocess.PIPE)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-g', '60', str(out_mp4)], stdin=node.stdout)
    node.stdout.close()
    ff.wait(); node.wait()
    if node.returncode or ff.returncode:
        raise RuntimeError(f'Render fehlgeschlagen: {args}')


def contact_sheet(resolved_path, variant, times_v, out_png, label):
    from PIL import Image, ImageDraw
    tmp = Path(out_png).parent / f'_stills_{variant}'
    shutil.rmtree(tmp, ignore_errors=True)
    frames = sorted({max(0, int(round(t * FPS))) for t in times_v})
    run(['node', str(ROOT / 'engine' / 'render.mjs'), str(resolved_path), '--variant', variant, '--png', ','.join(map(str, frames)), '--out', str(tmp)])
    cols = 4; tw, th = 270, 480
    rows = math.ceil(len(frames) / cols)
    sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(frames):
        im = Image.open(tmp / f'f{f:05d}.png').convert('RGB').resize((tw, th))
        x, y = (i % cols) * tw, (i // cols) * (th + 26)
        sheet.paste(im, (x, y + 26)); d.text((x + 6, y + 6), f'{label} {f / FPS:.1f}s', fill=(74, 53, 82))
    sheet.save(out_png)
    return out_png


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    ep = Path(sys.argv[1]).resolve(); cmd = sys.argv[2]
    variants_arg = None
    if '--variants' in sys.argv:
        variants_arg = sys.argv[sys.argv.index('--variants') + 1].split(',')
    sb = json.loads((ep / 'storyboard.json').read_text())
    validate_static(sb)
    if cmd == 'tts':
        (ep / 'tts.json').write_text(json.dumps(tts_texts(sb), ensure_ascii=False, indent=1))
        print(json.dumps(tts_texts(sb), ensure_ascii=False, indent=1)); return
    au = ep / 'audio'
    words = load_words(au / 'words.json')
    main_wav = decode(au / 'main.mp3')
    main_dur = len(main_wav) / A.SR
    hook_wavs = {v: decode(au / f'hook-{v}.mp3') for v in sorted(sb['hooks']) if (variants_arg is None or v in variants_arg)}
    hook_durs = {v: len(w) / A.SR for v, w in hook_wavs.items()}
    hook_spans = {v: speech_span(w) for v, w in hook_wavs.items()}
    intro = sb.get('intro') or {}
    try:
        R = resolve(ep, sb, words, main_dur, hook_durs, hook_spans)
    except StoryError as e:
        print('FEHLER im Storyboard:\n' + str(e)); sys.exit(2)
    R['envelope'] = envelope(main_wav, R['endF'] + 2)
    work = ep / 'work'; work.mkdir(exist_ok=True)
    out = ep / 'out'; out.mkdir(exist_ok=True)
    qa = ep / 'qa'; qa.mkdir(exist_ok=True)
    def zoom_dur(V):  # universe zoom at the start: the whole hook, or at most intro.zoom seconds (0 = start in the scene)
        return min(V['offset'] - 0.1, float(intro['zoom'])) if 'zoom' in intro else V['offset'] - 0.1
    for v, V in R['variants'].items():
        V2 = dict(R); V2['zoomIn'] = {'dur': zoom_dur(V)}
        (work / f'resolved-{v}.json').write_text(json.dumps(V2, ensure_ascii=False))
    (work / 'resolved-tail.json').write_text(json.dumps({**R, 'zoomIn': {'dur': 0}}, ensure_ascii=False))
    report = {'mainDur': round(main_dur, 2), 'hits': [round(h['t'], 2) for h in R['hits']], 'scenes': len(sb['scenes']),
              'closing': R['outro']['questionIn'], 'cta': R['outro']['ctaIn'],
              'variants': {v: {'offset': V['offset'], 'hookSpeech': [round(x, 2) for x in hook_spans[v]],
                               'gap': round(V['offset'] + words[0]['s'] - hook_spans[v][1], 3)} for v, V in R['variants'].items()}}
    if not 6 <= len(R['hits']) <= 12:
        print(f'WARNUNG: {len(R["hits"])} Treffer (Vorgabe: etwa acht)')
    # contact sheet for the first variant
    v0 = sorted(R['variants'])[0]; off = R['variants'][v0]['offset']
    ts = [0.0, off * 0.5, off + 0.6]
    st = R['sceneStarts'] + [R['outro']['zoomStart']]
    for a, b in zip(st[:-1], st[1:]):
        ts += [off + a + 1.2, off + (a + b) / 2, off + b - 0.6]
    ts += [off + h['t'] + 0.12 for h in R['hits']][:4]
    ts += [off + R['outro']['zoomStart'] + 1.3, off + R['outro']['questionIn'] + 1.8, off + R['outro']['ctaIn'] + 1.2]
    sheet = contact_sheet(work / f'resolved-{v0}.json', v0, sorted(set(round(t, 2) for t in ts))[:24], qa / f'contact-{v0}.png', v0)
    report['contactSheet'] = str(sheet)
    if cmd == 'check':
        print(json.dumps(report, ensure_ascii=False, indent=1)); return

    # ---------- audio per variant ----------
    mixes = {}
    for v, V in R['variants'].items():
        total = (V['offF'] + R['endF']) / FPS
        off = V['offset']
        voice = np.zeros(int(total * A.SR) + A.SR)
        A.place(voice, hook_wavs[v], 0.0); A.place(voice, main_wav, off)
        sections = [(0.0, R['chords'][0][1])] + [(off + t, c) for t, c in R['chords'][1:]]
        ev = [(off + t, k) for t, k in R['events'] if off + t > 0.2]
        ev += [(R['variants'][v]['cardEnd'] - 0.2, 'whoosh')]
        zd = zoom_dur(V)
        hit_ts = [off + h['t'] for h in R['hits']]
        if intro and intro.get('accent', True):  # sound accent on the first spoken word
            hit_ts = [hook_spans[v][0]] + hit_ts
        pad, mel = A.build_music(total, sections, hit_ts, ev, (0.05, 0.05 + zd) if zd > 0 else (0.0, 0.0),
                                 (off + R['outro']['zoomStart'], off + R['outro']['zoomStart'] + R['outro']['zoomDur']), seed=7)
        mixed, lufs = A.mix(voice, pad, mel)
        mixed = mixed[: int(total * A.SR)]
        import soundfile as sf
        wav = work / f'mix-{v}.wav'; sf.write(wav, mixed.astype(np.float32), A.SR)
        mixes[v] = (wav, lufs)
    # ---------- video ----------
    jobs = []
    ncpu = max(1, os.cpu_count() or 1)

    def split(a, b, n):
        step = math.ceil((b - a) / n); return [(x, min(b, x + step)) for x in range(a, b, step)]
    for v, V in R['variants'].items():
        head_end = V['offF'] + R['tailF']
        for i, (a, b) in enumerate(split(0, head_end, 1)):
            jobs.append((work / f'resolved-{v}.json', ['--variant', v, '--from', str(a), '--to', str(b)], work / f'head-{v}-{i}.mp4'))
    tail_n = R['endF'] - R['tailF']
    tail_parts = split(0, tail_n, ncpu)
    for i, (a, b) in enumerate(tail_parts):
        jobs.append((work / 'resolved-tail.json', ['--tail', '--from', str(a), '--to', str(b)], work / f'tail-{i}.mp4'))
    with ThreadPoolExecutor(max_workers=ncpu) as ex:
        list(ex.map(lambda j: render_chunk(*j), jobs))
    results = {}
    for v, V in R['variants'].items():
        lst = work / f'concat-{v}.txt'
        parts = [work / f'head-{v}-0.mp4'] + [work / f'tail-{i}.mp4' for i in range(len(tail_parts))]
        lst.write_text(''.join(f"file '{p}'\n" for p in parts))
        dst = out / f'{sb["slug"]}-hook-{v}.mp4'
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(mixes[v][0]), '-map', '0:v', '-map', '1:a',
             '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', str(dst)])
        probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', str(dst)],
                                          capture_output=True, check=True).stdout)
        results[v] = {'file': str(dst), 'duration': round(float(probe['format']['duration']), 2), 'lufs': round(mixes[v][1], 2),
                      'streams': [s['codec_type'] for s in probe['streams']]}
    report['outputs'] = results
    (qa / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
