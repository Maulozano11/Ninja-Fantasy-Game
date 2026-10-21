import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
polys = []
if len(sys.argv) > 8:
    import json
    polys = json.loads(sys.argv[8])
im = Image.open(src).convert('RGB')
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(c)
for x in range(x0, x1):
    col = (255, 0, 255) if x % 10 == 0 else (120, 0, 120) if x % 5 == 0 else (45, 0, 45)
    if x % 5 == 0 or k >= 10:
        d.line([((x - x0) * k, 0), ((x - x0) * k, c.height)], fill=col)
    if x % 10 == 0: d.text(((x - x0) * k + 2, 2), str(x), fill=(255, 255, 0))
for y in range(y0, y1):
    col = (255, 0, 255) if y % 10 == 0 else (120, 0, 120) if y % 5 == 0 else (45, 0, 45)
    if y % 5 == 0 or k >= 10:
        d.line([(0, (y - y0) * k), (c.width, (y - y0) * k)], fill=col)
    if y % 10 == 0: d.text((2, (y - y0) * k + 2), str(y), fill=(255, 255, 0))
for p in polys:
    d.line([((x - x0) * k, (y - y0) * k) for x, y in p + [p[0]]], fill=(0, 255, 255), width=2)
c.save(out)
