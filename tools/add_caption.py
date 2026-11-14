#!/usr/bin/env python3
"""Store the captions of an episode: EPISODE/captions.md (readable) and one row in state/captions.csv.

Usage: python3 tools/add_caption.py EPISODE
Reads EPISODE/captions.json with keys: titel, cta, instagram, youtube_titel, youtube_beschreibung, linkedin, tiktok.
"""
import csv, json, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ep = Path(sys.argv[1]).resolve()
c = json.loads((ep / 'captions.json').read_text())
sb = json.loads((ep / 'storyboard.json').read_text())
need = ['titel', 'cta', 'instagram', 'youtube_titel', 'youtube_beschreibung', 'linkedin', 'tiktok']
missing = [k for k in need if not c.get(k)]
if missing:
    sys.exit('captions.json: es fehlt ' + ', '.join(missing))
md = [f"# {c['titel']}", '', '## Instagram', '', c['instagram'], '', '## YouTube', '', f"**{c['youtube_titel']}**", '', c['youtube_beschreibung'],
      '', '## LinkedIn', '', c['linkedin'], '', '## TikTok', '', c['tiktok'], '']
(ep / 'captions.md').write_text('\n'.join(md))
today = datetime.date.today().isoformat()
with open(ROOT / 'state' / 'captions.csv', 'a', newline='') as f:
    csv.writer(f, delimiter=';', quoting=csv.QUOTE_MINIMAL).writerow([today, sb['slug'], c['titel'], c['cta']] + [c[k] for k in need[2:]])
print('ok', ep / 'captions.md')
