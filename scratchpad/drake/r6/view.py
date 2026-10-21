"""python3 -I view.py <earth.ts> <out.png> <zoom> <frames comma> [bg r,g,b] [crop x0,y0,x1,y1]"""
import sys
import numpy as np
from PIL import Image
exec(open(__file__.replace('view.py', 'metrics.py')).read().split('\ndef main')[0])
ts, out, Z, fl = sys.argv[1], sys.argv[2], int(sys.argv[3]), [int(v) for v in sys.argv[4].split(',')]
bg = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 else (52, 64, 48)
frames, anchor, off = load(ts)
H, W = frames[0].shape[:2]
box = [int(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else [0, 0, W, H]
w, h = box[2] - box[0], box[3] - box[1]
img = Image.new('RGB', ((w * Z + 4) * len(fl), h * Z), (255, 255, 255))
for i, fi in enumerate(fl):
    b = Image.new('RGBA', (W, H), bg + (255,))
    b.alpha_composite(Image.fromarray(frames[fi], 'RGBA'))
    img.paste(b.convert('RGB').crop(box).resize((w * Z, h * Z), Image.NEAREST), (i * (w * Z + 4), 0))
img.save(out)
