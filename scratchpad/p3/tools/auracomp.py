"""auracomp.py <groupdir> <char.png> <out.png> <zoom> [crop x0,y0,x1,y1]: back + character + front on grass, all frames"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
G, CH, out, z = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 else None
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def frames(n):
    m = man[n]; sh = Image.open(os.path.join(G, m['file'])).convert('RGBA'); a = m['anims']['idle']
    nf = sh.width // m['frameW']
    return [sh.crop((i*m['frameW'], a['row']*m['frameH'], (i+1)*m['frameW'], (a['row']+1)*m['frameH'])) for i in range(nf)], m['anchor']
B, anc = frames('aura_back'); F, _ = frames('aura')
ch = Image.open(CH).convert('RGBA')
res = []
for b, f in zip(B, F):
    c = Image.new('RGBA', b.size, (84, 110, 70, 255))
    c.alpha_composite(b)
    c.alpha_composite(ch, (anc[0] - 64, anc[1] - 120)) if anc[0] >= 64 else c.paste(ch.crop((64 - anc[0], 0, ch.width, ch.height)), (0, anc[1] - 120), ch.crop((64 - anc[0], 0, ch.width, ch.height)))
    c.alpha_composite(f)
    if crop: c = c.crop(crop)
    res.append(c)
w, h = res[0].size
img = Image.new('RGB', (len(res) * (w * z + 4), h * z + 12), (60, 0, 60)); d = ImageDraw.Draw(img)
for i, c in enumerate(res):
    img.paste(c.convert('RGB').resize((w * z, h * z), Image.NEAREST), (i * (w * z + 4), 12)); d.text((i * (w * z + 4) + 2, 0), f'f{i}', fill=(255, 255, 0))
img.save(out); print(img.size)
