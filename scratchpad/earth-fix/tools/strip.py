"""strip.py <groupdir> <sprite> <anim> <out.png> [scale] [bg: dark|light|both] [frames a-b] [cols]"""
import json, sys, os
from PIL import Image, ImageDraw
g, name, anim, out = sys.argv[1:5]
sc = int(sys.argv[5]) if len(sys.argv) > 5 else 2
bgm = sys.argv[6] if len(sys.argv) > 6 else 'both'
rng = sys.argv[7] if len(sys.argv) > 7 else None
cols = int(sys.argv[8]) if len(sys.argv) > 8 else 0
m = json.load(open(os.path.join(g, 'manifest.json')))['sprites'][name]
sh = Image.open(os.path.join(g, m['file'])).convert('RGBA')
d = m['anims'][anim]; fw, fh = m['frameW'], m['frameH']
idx = list(range(d['frames']))
if rng:
    a, b = map(int, rng.split('-')); idx = list(range(a, b + 1))
bgs = {'dark': [(34, 34, 45, 255)], 'light': [(222, 214, 190, 255)], 'both': [(34, 34, 45, 255), (222, 214, 190, 255)], 'green': [(86,120,60,255)]}[bgm]
cols = cols or len(idx)
rows = (len(idx) + cols - 1) // cols
W = cols * (fw * sc + 4); H = rows * len(bgs) * (fh * sc + 4)
o = Image.new('RGBA', (W, H), (60, 60, 70, 255))
for k, i in enumerate(idx):
    f = sh.crop((i * fw, d['row'] * fh, (i + 1) * fw, (d['row'] + 1) * fh)).resize((fw * sc, fh * sc), Image.NEAREST)
    for j, bg in enumerate(bgs):
        c = Image.new('RGBA', f.size, bg); c.alpha_composite(f)
        x = (k % cols) * (fw * sc + 4); y = ((k // cols) * len(bgs) + j) * (fh * sc + 4)
        o.paste(c, (x, y))
        ImageDraw.Draw(o).text((x + 2, y + 2), str(i), fill=(255, 0, 255, 255))
o.save(out)
print(o.size)
