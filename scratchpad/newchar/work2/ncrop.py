import os, sys
import numpy as np
from PIL import Image, ImageDraw

D = os.path.dirname(os.path.abspath(__file__))
N = np.load(os.path.join(D, 'native.npy'))
name, x0, y0, x1, y1, k = sys.argv[1], *map(int, sys.argv[2:7])
a = N[y0:y1, x0:x1].astype(np.uint8)
im = Image.fromarray(a).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range(x0, x1):
    if x % 2 == 0:
        col = (0, 255, 255) if x % 10 == 0 else (0, 140, 140) if x % 5 == 0 else (0, 70, 70)
        if x % 5 == 0 or k >= 12:
            d.line(((x - x0) * k, 0, (x - x0) * k, im.height), fill=col)
    if x % 10 == 0:
        d.text(((x - x0) * k + 2, 2), str(x), fill=(255, 255, 0))
for y in range(y0, y1):
    if y % 2 == 0:
        col = (0, 255, 255) if y % 10 == 0 else (0, 140, 140) if y % 5 == 0 else (0, 70, 70)
        if y % 5 == 0 or k >= 12:
            d.line((0, (y - y0) * k, im.width, (y - y0) * k), fill=col)
    if y % 10 == 0:
        d.text((2, (y - y0) * k + 2), str(y), fill=(255, 255, 0))
im.save(os.path.join(D, f'nc-{name}.png'))
