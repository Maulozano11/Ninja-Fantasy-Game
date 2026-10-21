"""Zoom a crop of one or more 256 x 256 PNGs side by side with a labelled fine-pixel grid.

  python3 -I zoom.py out.png x0 y0 x1 y1 k in1.png [in2.png ...]
"""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
x0, y0, x1, y1, k = (int(a) for a in sys.argv[2:7])
ims = []
for p in sys.argv[7:]:
    a = Image.open(p).convert('RGBA')
    bg = Image.new('RGBA', a.size, (214, 214, 220, 255))
    bg.alpha_composite(a)
    c = bg.crop((x0, y0, x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST).convert('RGB')
    d = ImageDraw.Draw(c)
    for x in range(x0, x1):
        if x % 5 == 0:
            d.line([((x - x0) * k, 0), ((x - x0) * k, c.height)], fill=(0, 170, 0) if x % 10 else (255, 0, 255))
    for y in range(y0, y1):
        if y % 5 == 0:
            d.line([(0, (y - y0) * k), (c.width, (y - y0) * k)], fill=(0, 170, 0) if y % 10 else (255, 0, 255))
    for x in range(x0 - x0 % 10 + (10 if x0 % 10 else 0), x1, 10):
        d.text(((x - x0) * k + 2, 2), str(x), fill=(255, 0, 255))
    for y in range(y0 - y0 % 10 + (10 if y0 % 10 else 0), y1, 10):
        d.text((2, (y - y0) * k + 2), str(y), fill=(255, 0, 255))
    ims.append(c)
W = sum(i.width for i in ims) + 10 * (len(ims) - 1)
o = Image.new('RGB', (W, ims[0].height), (255, 255, 255))
x = 0
for i in ims:
    o.paste(i, (x, 0))
    x += i.width + 10
o.save(out)
