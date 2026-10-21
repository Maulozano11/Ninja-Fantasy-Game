"""look.py <groupdir> <sprite> <anim> <frames e.g. 0-11 or 0,3,5> <zoom> <out.png> [crop x0,y0,x1,y1] [bg dark|grass|both]"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
G, name, anim, fr, z, out = sys.argv[1:7]
z = int(z)
crop = None
bgs = 'both'
for a in sys.argv[7:]:
    if a in ('dark', 'grass', 'both'): bgs = a
    elif a: crop = tuple(int(v) for v in a.split(','))
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = Image.open(os.path.join(G, m['file'])).convert('RGBA')
a = m['anims'][anim]
idx = []
for part in fr.split(','):
    if '-' in part:
        s, e = part.split('-'); idx += list(range(int(s), int(e) + 1))
    else: idx.append(int(part))
fw, fh = m['frameW'], m['frameH']
fs = [sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)) for i in idx]
if crop: fs = [f.crop(crop) for f in fs]
w, h = fs[0].size
cols = {'dark': (21, 21, 29), 'grass': (84, 110, 70)}
rows = ['dark', 'grass'] if bgs == 'both' else [bgs]
img = Image.new('RGB', (len(fs) * (w * z + 4), len(rows) * (h * z + 14)), (60, 0, 60))
d = ImageDraw.Draw(img)
for r, b in enumerate(rows):
    for c, f in enumerate(fs):
        bg = Image.new('RGBA', f.size, cols[b] + (255,))
        bg.alpha_composite(f)
        img.paste(bg.convert('RGB').resize((w * z, h * z), Image.NEAREST), (c * (w * z + 4), r * (h * z + 14) + 12))
        d.text((c * (w * z + 4) + 2, r * (h * z + 14)), f'f{idx[c]}', fill=(255, 255, 0))
img.save(out)
print(img.size)
