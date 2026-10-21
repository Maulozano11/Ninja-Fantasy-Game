# strip.py <group> <sprite> <anim> <out> [zoom] [bg] [frames] [cols] [crop x0,y0,x1,y1]: frames in a grid, holes boxed red
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
G, name, an, out = sys.argv[1:5]
Z = int(sys.argv[5]) if len(sys.argv) > 5 else 3
BG = sys.argv[6] if len(sys.argv) > 6 else 'grass'
BGC = {'his': (32, 32, 42), 'grass': (78, 104, 64), 'green': (0, 255, 0)}.get(BG) or tuple(int(v) for v in BG.split(','))
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
s = MAN[name]; a = s['anims'][an]
idx = [int(v) for v in sys.argv[7].split(',')] if len(sys.argv) > 7 and sys.argv[7] != 'all' else list(range(a['frames']))
COLS = int(sys.argv[8]) if len(sys.argv) > 8 else len(idx)
crop = tuple(int(v) for v in sys.argv[9].split(',')) if len(sys.argv) > 9 else None
import holes as H
sh = Image.open(os.path.join(G, s['file'])).convert('RGBA')
tiles = []
for i in idx:
    f = sh.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH']))
    hl = H.holes(f)
    if crop: f = f.crop(crop)
    b = Image.alpha_composite(Image.new('RGBA', f.size, BGC + (255,)), f).convert('RGB').resize((f.width * Z, f.height * Z), Image.NEAREST)
    d = ImageDraw.Draw(b)
    ox, oy = (crop[0], crop[1]) if crop else (0, 0)
    for x, y, n in hl: d.rectangle([(x - ox) * Z - 3, (y - oy) * Z - 3, (x - ox) * Z + Z + 2, (y - oy) * Z + Z + 2], outline=(255, 0, 0))
    d.text((2, 2), '%d (%d)' % (i, len(hl)), fill=(255, 255, 0))
    tiles.append(b)
w, h = tiles[0].size; rows = (len(tiles) + COLS - 1) // COLS
o = Image.new('RGB', (COLS * (w + 4) - 4, rows * (h + 4) - 4), (10, 10, 14))
for j, t in enumerate(tiles): o.paste(t, ((j % COLS) * (w + 4), (j // COLS) * (h + 4)))
o.save(out); print(o.size)
