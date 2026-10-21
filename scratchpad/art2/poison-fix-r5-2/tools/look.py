"""look.py <groupDir> <sprite> <anim> <frames comma|all> <out.png> [k=3] [bg=panel|grass|dark|mag] [crop=x0,y0,x1,y1]"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
G, name, anim, fl, out = sys.argv[1:6]
opts = dict(a.split('=') for a in sys.argv[6:])
k = int(opts.get('k', 3))
BGS = {'panel': (31, 33, 46), 'grass': (84, 110, 70), 'dark': (21, 21, 29), 'mag': (255, 0, 255)}
bgs = opts.get('bg', 'panel').split('+')
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = Image.open(os.path.join(G, man['file'])).convert('RGBA')
a = man['anims'][anim]
idx = range(a['frames']) if fl == 'all' else [int(v) for v in fl.split(',')]
fw, fh = man['frameW'], man['frameH']
crop = tuple(int(v) for v in opts['crop'].split(',')) if 'crop' in opts else (0, 0, fw, fh)
cw, ch = crop[2] - crop[0], crop[3] - crop[1]
can = Image.new('RGB', (len(idx) * (cw * k + 4), len(bgs) * (ch * k + 4)), (255, 255, 255))
d = ImageDraw.Draw(can)
for r, bn in enumerate(bgs):
    for c, i in enumerate(idx):
        f = sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)).crop(crop)
        b = Image.new('RGBA', f.size, BGS[bn] + (255,))
        b.alpha_composite(f)
        can.paste(b.convert('RGB').resize((cw * k, ch * k), Image.NEAREST), (c * (cw * k + 4), r * (ch * k + 4)))
        d.text((c * (cw * k + 4) + 2, r * (ch * k + 4) + 2), str(i), fill=(255, 255, 0))
can.save(out)
