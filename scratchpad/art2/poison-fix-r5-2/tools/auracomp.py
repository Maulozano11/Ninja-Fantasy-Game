"""auracomp.py <groupDir> <character.png> <out.png> [frames] [crop] : back + character + front, alpha of slits"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
G, CH, out = sys.argv[1:4]
fl = sys.argv[4] if len(sys.argv) > 4 else 'all'
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 else None
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def frames(n):
    m = man[n]; sh = Image.open(os.path.join(G, m['file'])).convert('RGBA'); a = m['anims']['idle']
    return [sh.crop((i * m['frameW'], a['row'] * m['frameH'], (i + 1) * m['frameW'], (a['row'] + 1) * m['frameH'])) for i in range(a['frames'])]
B, F = frames('aura_back'), frames('aura')
ch = Image.open(CH).convert('RGBA')
m = man['aura']; ax, ay = m['anchor']
idx = range(len(B)) if fl == 'all' else [int(v) for v in fl.split(',')]
comps = []
for i in idx:
    c = Image.new('RGBA', B[i].size, (0, 0, 0, 0))
    c.alpha_composite(B[i]); c.alpha_composite(ch, (ax - 64, ay - 120)); c.alpha_composite(F[i])
    comps.append((i, c))
    if crop:
        a = np.asarray(c)[..., 3][crop[1]:crop[3], crop[0]:crop[2]]
        low = (a <= 60)
        print('frame', i, 'alpha<=60 px in crop:', int(low.sum()))
k = 4
cw, chh = (crop[2] - crop[0], crop[3] - crop[1]) if crop else B[0].size
can = Image.new('RGB', (len(comps) * (cw * k + 4), chh * k), (255, 255, 255))
d = ImageDraw.Draw(can)
for n, (i, c) in enumerate(comps):
    bg = Image.new('RGBA', c.size, (255, 0, 255, 255)); bg.alpha_composite(c)
    if crop: bg = bg.crop(crop)
    can.paste(bg.convert('RGB').resize((cw * k, chh * k), Image.NEAREST), (n * (cw * k + 4), 0))
    d.text((n * (cw * k + 4) + 2, 2), str(i), fill=(255, 255, 0))
can.save(out)
