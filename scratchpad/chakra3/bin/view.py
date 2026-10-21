# view.py img x0 y0 x1 y1 k out [grid]
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
g = int(sys.argv[8]) if len(sys.argv) > 8 else 10
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
W, H = (x1 - x0) * k, (y1 - y0) * k
big = im.resize((W, H), Image.NEAREST)
c = Image.new('RGB', (W + 40, H + 20), (0, 0, 0))
c.paste(big, (40, 20))
d = ImageDraw.Draw(c)
for x in range((x0 // g + 1) * g, x1, g):
    X = 40 + (x - x0) * k
    d.line([(X, 20), (X, 20 + H)], fill=(255, 0, 255) if x % (g * 5) == 0 else (90, 0, 90), width=1)
    if x % (g * 2) == 0: d.text((X - 8, 4), str(x), fill=(255, 255, 0))
for y in range((y0 // g + 1) * g, y1, g):
    Y = 20 + (y - y0) * k
    d.line([(40, Y), (40 + W, Y)], fill=(255, 0, 255) if y % (g * 5) == 0 else (90, 0, 90), width=1)
    if y % (g * 2) == 0: d.text((2, Y - 5), str(y), fill=(255, 255, 0))
c.save(out)
