"""redzoom.py which x0 y0 w h k out [ourpng ...]: reduced reference crop (and our renders) with ruler."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image, ImageDraw
import heroine_ref as H
which, x0, y0, w, h, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
ims = []
srcs = ([H.reduced(which)] if which != '-' else []) + [np.asarray(Image.open(p).convert('RGBA')) for p in sys.argv[8:]]
for a in srcs:
    c = a[y0:y0 + h, x0:x0 + w]
    bg = np.full(c.shape[:2] + (3,), 200, np.uint8)
    m = c[..., 3] > 0
    bg[m] = c[m, :3]
    im = Image.fromarray(bg).resize((w * k, h * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for x in range(w):
        d.text((x * k + 2, 2), str((x0 + x) % 100), fill=(255, 0, 0))
    for y in range(h):
        d.text((2, y * k + 12), str((y0 + y) % 100), fill=(255, 0, 0))
    ims.append(im)
W = sum(i.width for i in ims) + 8 * (len(ims) - 1)
sheet = Image.new('RGB', (W, h * k), (255, 255, 255))
x = 0
for i in ims:
    sheet.paste(i, (x, 0))
    x += i.width + 8
sheet.save(out)
