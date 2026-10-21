# holemap.py <group> <sprite> <anim> <frame> <out> [zoom]: frame on pure green with holes boxed red
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import importlib.util
spec = importlib.util.spec_from_file_location('h', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'holes.py'))
G, name, an, i, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
Z = int(sys.argv[6]) if len(sys.argv) > 6 else 4
sys.argv = [sys.argv[0], G, name]
src = open(spec.origin).read().split('for n in names:')[0]
ns = {}; exec(src, ns)
MAN = ns['MAN']; s = MAN[name]; a = s['anims'][an]
sh = Image.open(os.path.join(G, s['file'])).convert('RGBA')
f = sh.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH']))
hl = ns['holes'](np.asarray(f)[..., 3])
b = Image.new('RGBA', f.size, (0, 255, 0, 255)); b = Image.alpha_composite(b, f).convert('RGB').resize((f.width * Z, f.height * Z), Image.NEAREST)
d = ImageDraw.Draw(b)
for x, y, n in hl: d.rectangle([x * Z - 3, y * Z - 3, x * Z + Z + 3, y * Z + Z + 3], outline=(255, 0, 0))
b.save(out); print(len(hl), hl[:40])
