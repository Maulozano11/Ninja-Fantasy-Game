# view.py <group> <out.png> <zoom> <bg r,g,b|his|grass> spec...   spec = sprite:anim:i[,i..][@x0,y0,x1,y1]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
G, OUT, Z, BG = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
BGC = {'his': (32, 32, 42), 'grass': (78, 104, 64), 'green': (0, 255, 0)}.get(BG) or tuple(int(v) for v in BG.split(','))
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
tiles = []
for spec in sys.argv[5:]:
    crop = None
    if '@' in spec:
        spec, c = spec.split('@'); crop = tuple(int(v) for v in c.split(','))
    name, an, idx = spec.split(':')
    s = MAN[name]; sh = Image.open(os.path.join(G, s['file'])).convert('RGBA'); a = s['anims'][an]
    for i in [int(v) for v in idx.split(',')]:
        f = sh.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH']))
        if crop: f = f.crop(crop)
        b = Image.new('RGBA', f.size, BGC + (255,)); b = Image.alpha_composite(b, f).convert('RGB')
        b = b.resize((b.width * Z, b.height * Z), Image.NEAREST)
        d = ImageDraw.Draw(b); d.text((2, 2), '%s %s %d' % (name, an, i), fill=(255, 255, 0))
        tiles.append(b)
W = sum(t.width for t in tiles) + 6 * (len(tiles) - 1); H = max(t.height for t in tiles)
o = Image.new('RGB', (W, H), (10, 10, 14)); x = 0
for t in tiles: o.paste(t, (x, 0)); x += t.width + 6
o.save(OUT)
print(o.size)
