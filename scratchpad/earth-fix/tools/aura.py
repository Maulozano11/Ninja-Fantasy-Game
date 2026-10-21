import json, sys, os
from PIL import Image, ImageDraw
g, char, out = sys.argv[1:4]
sc = int(sys.argv[4]) if len(sys.argv) > 4 else 3
frs = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else list(range(12))
M = json.load(open(os.path.join(g, 'manifest.json')))['sprites']
C = Image.open(char).convert('RGBA')
def fr(n, i):
    m = M[n]; sh = Image.open(os.path.join(g, m['file'])).convert('RGBA'); d = m['anims']['idle']
    return sh.crop((i * m['frameW'], d['row'] * m['frameH'], (i + 1) * m['frameW'], (d['row'] + 1) * m['frameH']))
m = M['aura']; ax, ay = m['anchor']; fw, fh = m['frameW'], m['frameH']
bgs = [(34, 34, 45, 255), (222, 214, 190, 255)]
o = Image.new('RGBA', (len(frs) * (fw * sc + 4), 2 * (fh * sc + 4)), (60, 60, 70, 255))
for k, i in enumerate(frs):
    for j, bg in enumerate(bgs):
        c = Image.new('RGBA', (fw, fh), bg)
        c.alpha_composite(fr('aura_back', i))
        c.alpha_composite(C, (ax - 64, ay - 120))
        c.alpha_composite(fr('aura', i))
        o.paste(c.resize((fw * sc, fh * sc), Image.NEAREST), (k * (fw * sc + 4), j * (fh * sc + 4)))
o.save(out); print(o.size)
