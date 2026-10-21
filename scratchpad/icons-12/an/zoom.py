"""Zoom a region of an image with a grid and coordinates; optionally print the hex colours.

usage: zoom.py <img> <out.png> x0 y0 x1 y1 k [grid_step_src] [hex]
"""
import sys
from PIL import Image, ImageDraw

p, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, k = (int(v) for v in sys.argv[3:8])
step = float(sys.argv[8]) if len(sys.argv) > 8 else 0
im = Image.open(p).convert('RGB')
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
M = 30
o = Image.new('RGB', (c.size[0] + M, c.size[1] + M), (16, 16, 20))
o.paste(c, (M, M))
d = ImageDraw.Draw(o)
for x in range(x0, x1):
    if x % 5 == 0:
        d.text((M + (x - x0) * k + 1, 2), str(x), fill=(220, 220, 220))
        d.line([(M + (x - x0) * k, M - 6), (M + (x - x0) * k, M)], fill=(220, 220, 220))
for y in range(y0, y1):
    if y % 5 == 0:
        d.text((1, M + (y - y0) * k + 1), str(y), fill=(220, 220, 220))
        d.line([(M - 6, M + (y - y0) * k), (M, M + (y - y0) * k)], fill=(220, 220, 220))
if step:
    # grid of the target cells (target pixel n spans n*step .. (n+1)*step in source px)
    import math
    n = math.floor(x0 / step)
    while n * step < x1:
        X = M + (n * step - x0) * k
        if X >= M:
            d.line([(X, M), (X, o.size[1])], fill=(255, 0, 200))
        n += 1
    n = math.floor(y0 / step)
    while n * step < y1:
        Y = M + (n * step - y0) * k
        if Y >= M:
            d.line([(M, Y), (o.size[0], Y)], fill=(255, 0, 200))
        n += 1
o.save(out)
if len(sys.argv) > 9:
    for y in range(y0, y1):
        print(y, ' '.join('%02x%02x%02x' % im.getpixel((x, y)) for x in range(x0, x1)))
