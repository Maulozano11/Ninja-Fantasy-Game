"""Her native pixels zoomed with a labelled grid every 5 (thin) / 10 (thick) of her pixels.

  python3 -I gridview.py <which|path.npy|path.png> x0 y0 x1 y1 k out.png [step]
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

W = os.path.dirname(os.path.abspath(__file__))
w = sys.argv[1]
x0, y0, x1, y1, k = map(int, sys.argv[2:7])
out = sys.argv[7]
step = int(sys.argv[8]) if len(sys.argv) > 8 else 5
if w.endswith('.png'):
    a = np.asarray(Image.open(w).convert('RGBA')).astype(np.float64)
    if a.shape[0] != 256 and 'reduced@1' in w:
        f = np.zeros((256, 256, 4))
        f[112:112 + a.shape[0], 72:72 + a.shape[1]] = a
        a = f
    al = a[..., 3:4] / 255
    N = (a[..., :3] * al + np.array([236, 236, 240]) * (1 - al)).astype(np.uint8)
elif w.endswith('.npy'):
    N = np.load(w)
else:
    N = np.load(os.path.join(W, w + '-native.npy'))
sub = N[y0:y1, x0:x1].astype(np.uint8)
M = 28
im = Image.fromarray(sub).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
c = Image.new('RGB', (im.width + M, im.height + M), (255, 255, 255))
c.paste(im, (M, M))
d = ImageDraw.Draw(c)
for x in range(x0, x1 + 1):
    if x % step == 0:
        X = M + (x - x0) * k
        d.line((X, M, X, c.height), fill=(255, 0, 255) if x % (2 * step) == 0 else (120, 200, 255), width=1)
        if x % (2 * step) == 0:
            d.text((X + 1, 2), str(x), fill=(0, 0, 0))
for y in range(y0, y1 + 1):
    if y % step == 0:
        Y = M + (y - y0) * k
        d.line((M, Y, c.width, Y), fill=(255, 0, 255) if y % (2 * step) == 0 else (120, 200, 255), width=1)
        if y % (2 * step) == 0:
            d.text((1, Y + 1), str(y), fill=(0, 0, 0))
c.save(out)
