"""markholes.py <groupdir> <sprite> <anim> <frame> <out> [scale]: enclosed clear px magenta, pinholes cyan, on light bg."""
import json, sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from holes_lib import enclosed
g, n, an, i, out = sys.argv[1:6]; i = int(i)
sc = int(sys.argv[6]) if len(sys.argv) > 6 else 4
m = json.load(open(os.path.join(g, 'manifest.json')))['sprites'][n]
sh = Image.open(os.path.join(g, m['file'])).convert('RGBA'); d = m['anims'][an]; fw, fh = m['frameW'], m['frameH']
f = sh.crop((i * fw, d['row'] * fh, (i + 1) * fw, (d['row'] + 1) * fh))
a = np.asarray(f)[..., 3]
enc = enclosed(a)
c = Image.new('RGBA', f.size, (222, 214, 190, 255)); c.alpha_composite(f)
arr = np.asarray(c).copy(); arr[enc] = (255, 0, 255, 255)
Image.fromarray(arr).resize((fw * sc, fh * sc), Image.NEAREST).save(out)
print(enc.sum())
