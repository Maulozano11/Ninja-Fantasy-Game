import sys, numpy as np
from PIL import Image, ImageDraw
# usage: zoom.py npy out.png x0 y0 x1 y1 scale frames(comma) [bg r,g,b]
npy, out, x0, y0, x1, y1, sc, frs = sys.argv[1:9]
x0, y0, x1, y1, sc = map(int, (x0, y0, x1, y1, sc))
bg = tuple(map(int, sys.argv[9].split(','))) if len(sys.argv) > 9 else (31, 33, 46)
F = np.load(npy)
frs = [int(v) for v in frs.split(',')]
w, h = (x1 - x0) * sc, (y1 - y0) * sc
img = Image.new('RGB', (len(frs) * (w + 6), h + 14), (255, 255, 255))
d = ImageDraw.Draw(img)
for i, fi in enumerate(frs):
    b = Image.new('RGBA', (x1 - x0, y1 - y0), bg + (255,))
    b.alpha_composite(Image.fromarray(F[fi][y0:y1, x0:x1], 'RGBA'))
    img.paste(b.convert('RGB').resize((w, h), Image.NEAREST), (i * (w + 6), 14))
    d.text((i * (w + 6) + 2, 1), f'f{fi}', fill=(0, 0, 0))
img.save(out)
