"""zoom.py <groupdir> <sprite> <anim> <frames comma> <x0,y0,x1,y1> <scale> <out> [bg]"""
import json, sys, os
from PIL import Image, ImageDraw
g, name, anim, frs, box, sc, out = sys.argv[1:8]
bg = sys.argv[8] if len(sys.argv) > 8 else 'light'
BG = {'light': (222, 214, 190, 255), 'dark': (34, 34, 45, 255), 'magenta': (255, 0, 255, 255)}[bg]
sc = int(sc); x0, y0, x1, y1 = map(int, box.split(','))
m = json.load(open(os.path.join(g, 'manifest.json')))['sprites'][name]
sh = Image.open(os.path.join(g, m['file'])).convert('RGBA')
d = m['anims'][anim]; fw, fh = m['frameW'], m['frameH']
fl = [int(v) for v in frs.split(',')]
w, h = (x1 - x0) * sc, (y1 - y0) * sc
o = Image.new('RGBA', (len(fl) * (w + 4), h), (60, 60, 70, 255))
for k, i in enumerate(fl):
    f = sh.crop((i * fw + x0, d['row'] * fh + y0, i * fw + x1, d['row'] * fh + y1)).resize((w, h), Image.NEAREST)
    c = Image.new('RGBA', f.size, BG); c.alpha_composite(f)
    o.paste(c, (k * (w + 4), 0))
    ImageDraw.Draw(o).text((k * (w + 4) + 2, 2), str(i), fill=(255, 0, 255, 255))
o.save(out); print(o.size)
