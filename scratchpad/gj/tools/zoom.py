# zoom.py IMG x0 y0 x1 y1 scale out [grid]
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
x0, y0, x1, y1, s = map(int, sys.argv[2:7])
out = sys.argv[7]
grid = int(sys.argv[8]) if len(sys.argv) > 8 else 10
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST)
d = ImageDraw.Draw(c)
for x in range((x0 // grid + 1) * grid, x1, grid):
    d.line([((x - x0) * s, 0), ((x - x0) * s, c.height)], fill=(0, 255, 0) if x % (grid * 5) == 0 else (0, 110, 0))
    if x % (grid * 5) == 0: d.text(((x - x0) * s + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // grid + 1) * grid, y1, grid):
    d.line([(0, (y - y0) * s), (c.width, (y - y0) * s)], fill=(0, 255, 0) if y % (grid * 5) == 0 else (0, 110, 0))
    if y % (grid * 5) == 0: d.text((2, (y - y0) * s + 2), str(y), fill=(255, 255, 0))
c.save(out)
