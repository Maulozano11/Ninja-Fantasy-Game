"""view.py <earth.ts> <out.png> [frames] [zoom] [box x0,y0,x1,y1] [cols]: decoded frames on his panel colour."""
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from tsload import load
fr, anc, off = load(sys.argv[1])
H, W = fr[0].shape[:2]
idx = [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 and sys.argv[3] else list(range(len(fr)))
Z = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] else 2
box = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[5] else [0, 0, W, H]
cols = int(sys.argv[6]) if len(sys.argv) > 6 else len(idx)
w, h = box[2] - box[0], box[3] - box[1]
rows = (len(idx) + cols - 1) // cols
out = Image.new('RGB', ((w * Z + 4) * cols, (h * Z + 4) * rows), (255, 255, 255))
for j, i in enumerate(idx):
    bg = Image.new('RGBA', (W, H), (34, 34, 44, 255))
    bg.alpha_composite(Image.fromarray(fr[i], 'RGBA'))
    t = bg.crop(box).convert('RGB').resize((w * Z, h * Z), Image.NEAREST)
    ImageDraw.Draw(t).text((3, 3), str(i), fill=(255, 255, 0))
    out.paste(t, ((j % cols) * (w * Z + 4), (j // cols) * (h * Z + 4)))
out.save(sys.argv[2])
print('size', W, H, 'anchor', anc, 'crop offset', off)
