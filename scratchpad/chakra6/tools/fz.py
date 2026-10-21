# fz.py G sprite anim frames(comma) x0,y0,x1,y1 scale out [bg r,g,b] [boost]
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
os.environ['G'] = sys.argv[1]
import importlib, ck
importlib.reload(ck)
import numpy as np
from PIL import Image, ImageDraw
name, anim = sys.argv[2], sys.argv[3]
idx = [int(v) for v in sys.argv[4].split(',')]
x0, y0, x1, y1 = [int(v) for v in sys.argv[5].split(',')]
sc = int(sys.argv[6]); out = sys.argv[7]
bg = tuple(int(v) for v in sys.argv[8].split(',')) if len(sys.argv) > 8 else (28, 36, 48)
boost = float(sys.argv[9]) if len(sys.argv) > 9 else 1.0
fs = ck.frames(name, anim)
ims = []
for i in idx:
    f = ck.on_bg(fs[i], bg)[y0:y1, x0:x1, :3] * boost
    ims.append((i, Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).resize(((x1-x0)*sc, (y1-y0)*sc), Image.NEAREST)))
cols = min(4, len(ims)); rows = (len(ims)+cols-1)//cols
w, h = ims[0][1].size
S = Image.new('RGB', (cols*(w+6), rows*(h+14)), (60, 60, 70)); d = ImageDraw.Draw(S)
for k, (i, im) in enumerate(ims):
    x, y = (k % cols)*(w+6), (k//cols)*(h+14)
    S.paste(im, (x, y+14)); d.text((x+2, y+1), f'{name}.{anim}[{i}]', fill=(255, 255, 0))
S.save(out)
