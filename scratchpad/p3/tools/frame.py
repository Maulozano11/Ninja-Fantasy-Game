"""frame.py <groupdir> <sprite> <anim> <i> <out.png>: one frame of a staged sprite"""
import json, os, sys
from PIL import Image
G, name, anim, i, out = sys.argv[1:6]
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = Image.open(os.path.join(G, m['file'])).convert('RGBA')
a = m['anims'][anim]; fw, fh = m['frameW'], m['frameH']; i = int(i)
sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh)).save(out)
