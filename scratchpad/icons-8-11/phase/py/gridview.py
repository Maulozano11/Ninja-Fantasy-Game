"""gridview.py <in.png> <out.png> <scale> [x0 y0 x1 y1] [mask.npy]: window at scale with a coordinate grid every 10 px (labels), optional crop and mask overlay."""
import sys
import numpy as np
from PIL import Image, ImageDraw
src, out, s = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
x0, y0, x1, y1 = (0, 0) + im.size
if len(sys.argv) >= 8:
    x0, y0, x1, y1 = map(int, sys.argv[4:8])
a = np.asarray(im).astype(float)
if len(sys.argv) >= 9:
    m = np.load(sys.argv[8])
    a = a.copy()
    a[m > 0] = a[m > 0] * 0.5 + np.array([255, 0, 200]) * 0.5
im = Image.fromarray(a.astype(np.uint8)).crop((x0, y0, x1, y1))
big = im.resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST)
pad = 22
can = Image.new('RGB', (big.size[0] + pad, big.size[1] + pad), (20, 20, 20))
can.paste(big, (pad, pad))
d = ImageDraw.Draw(can)
for x in range(x0, x1 + 1):
    if x % 5 == 0:
        X = pad + (x - x0) * s
        d.line([(X, pad), (X, can.size[1])], fill=(255, 255, 0) if x % 10 == 0 else (110, 110, 0), width=1)
        if x % 10 == 0:
            d.text((X + 1, 2), str(x), fill=(255, 255, 255))
for y in range(y0, y1 + 1):
    if y % 5 == 0:
        Y = pad + (y - y0) * s
        d.line([(pad, Y), (can.size[0], Y)], fill=(255, 255, 0) if y % 10 == 0 else (110, 110, 0), width=1)
        if y % 10 == 0:
            d.text((1, Y + 1), str(y), fill=(255, 255, 255))
can.save(out)
