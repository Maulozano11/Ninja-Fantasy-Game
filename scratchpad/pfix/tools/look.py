"""look.py <stageGroupDir> <sprite> <anim> <frames e.g. 0,3,4 or all> <zoom> <out.png> [crop x0,y0,x1,y1] [bg dark|grass|both]"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
G, name, anim, fl, k, out = sys.argv[1:7]
crop = tuple(int(v) for v in sys.argv[7].split(',')) if len(sys.argv) > 7 and sys.argv[7] != '-' else None
bgs = sys.argv[8] if len(sys.argv) > 8 else 'both'
k = int(k)
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = Image.open(os.path.join(G, man['file'])).convert('RGBA')
a = man['anims'][anim]
fw, fh = man['frameW'], man['frameH']
idx = range(a['frames']) if fl == 'all' else [int(v) for v in fl.split(',')]
BGS = {'dark': (31, 33, 46), 'grass': (84, 110, 70), 'parch': (222, 205, 160)}
use = ['dark', 'grass'] if bgs == 'both' else bgs.split('+')
fr = [sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in idx]
if crop:
    fr = [f.crop(crop) for f in fr]
w, h = fr[0].size
can = Image.new('RGB', (len(fr) * (w * k + 4), len(use) * (h * k + 14)), (90, 90, 90))
d = ImageDraw.Draw(can)
for r, bg in enumerate(use):
    for c, (i, f) in enumerate(zip(idx, fr)):
        b = Image.new('RGBA', f.size, BGS[bg] + (255,))
        b.alpha_composite(f)
        can.paste(b.convert('RGB').resize((w * k, h * k), Image.NEAREST), (c * (w * k + 4), r * (h * k + 14) + 14))
        d.text((c * (w * k + 4) + 2, r * (h * k + 14) + 2), f'{name} {anim} {i} {bg}', fill=(255, 255, 0))
can.save(out)
