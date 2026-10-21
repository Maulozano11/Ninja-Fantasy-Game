"""A part of one of his windows (his pixels) at a big zoom with a pixel grid and coordinates, plus
a text dump of the pixel colours (hex) for tracing."""
import sys
import numpy as np
from PIL import Image, ImageDraw

src, x0, y0, x1, y1, Z, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(src).convert('RGB')
a = np.asarray(im)
c = a[y0:y1, x0:x1]
h, w = c.shape[:2]
can = Image.new('RGB', (w * Z + 30, h * Z + 30), (16, 16, 16))
can.paste(Image.fromarray(c).resize((w * Z, h * Z), Image.NEAREST), (30, 30))
dr = ImageDraw.Draw(can)
for x in range(w + 1):
    col = (90, 90, 90) if (x0 + x) % 5 else (255, 255, 0)
    dr.line([(30 + x * Z, 30), (30 + x * Z, 30 + h * Z)], fill=col, width=1)
    if (x0 + x) % 5 == 0 and x < w:
        dr.text((30 + x * Z + 1, 2), str(x0 + x), fill=(255, 255, 0))
for y in range(h + 1):
    col = (90, 90, 90) if (y0 + y) % 5 else (255, 255, 0)
    dr.line([(30, 30 + y * Z), (30 + w * Z, 30 + y * Z)], fill=col, width=1)
    if (y0 + y) % 5 == 0 and y < h:
        dr.text((2, 30 + y * Z + 1), str(y0 + y), fill=(255, 255, 0))
can.save(out)
if len(sys.argv) > 8:
    with open(sys.argv[8], 'w') as f:
        for y in range(h):
            f.write('%3d ' % (y0 + y) + ' '.join('%02x%02x%02x' % tuple(c[y, x]) for x in range(w)) + '\n')
