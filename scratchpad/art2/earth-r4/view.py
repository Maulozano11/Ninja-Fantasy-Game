"""view.py <groupDir> <sprite> <anim> <frames e.g. 0,1,2 or 0-3> <scale> <out.png> [bg=dark|light|grass] [crop x0,y0,x1,y1] [cols]"""
import json
import os
import sys

from PIL import Image, ImageDraw

G, name, anim, fs, sc, out = sys.argv[1:7]
bgn = sys.argv[7] if len(sys.argv) > 7 else 'dark'
crop = [int(v) for v in sys.argv[8].split(',')] if len(sys.argv) > 8 and sys.argv[8] != '-' else None
cols = int(sys.argv[9]) if len(sys.argv) > 9 else 4
BGS = {'dark': (34, 34, 45, 255), 'light': (222, 214, 190, 255), 'grass': (86, 128, 64, 255)}
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = Image.open(os.path.join(G, m['file'])).convert('RGBA')
d = m['anims'][anim]
if '-' in fs:
    a, b = fs.split('-')
    idx = list(range(int(a), int(b) + 1))
else:
    idx = [int(v) for v in fs.split(',')]
sc = int(sc)
W, H = m['frameW'], m['frameH']
tiles = []
for i in idx:
    f = sheet.crop((i * W, d['row'] * H, (i + 1) * W, (d['row'] + 1) * H))
    if crop:
        f = f.crop(tuple(crop))
    bg = Image.new('RGBA', f.size, BGS[bgn])
    bg.alpha_composite(f)
    bg = bg.resize((f.width * sc, f.height * sc), Image.NEAREST)
    tiles.append((i, bg))
tw, th = tiles[0][1].size
cols = min(cols, len(tiles))
rows = (len(tiles) + cols - 1) // cols
o = Image.new('RGBA', (cols * (tw + 4), rows * (th + 14)), (0, 0, 0, 255))
dr = ImageDraw.Draw(o)
for k, (i, t) in enumerate(tiles):
    x, y = (k % cols) * (tw + 4), (k // cols) * (th + 14)
    o.paste(t, (x, y + 12))
    dr.text((x + 2, y), f'{name} {anim} f{i}', fill=(255, 255, 0))
o.save(out)
print(o.size)
