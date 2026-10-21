"""gridcrop.py <img> <out> x0 y0 x1 y1 zoom [step]: crop with grid lines every step px (labels in source coords)."""
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
x0, y0, x1, y1, z = [int(v) for v in sys.argv[3:8]]
step = int(sys.argv[8]) if len(sys.argv) > 8 else 20
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
d = ImageDraw.Draw(c)
for x in range((x0 // step + 1) * step, x1, step):
    d.line([((x - x0) * z, 0), ((x - x0) * z, c.height)], fill=(255, 0, 255) if x % (step * 5) == 0 else (120, 0, 120))
    if x % (step * 2) == 0:
        d.text(((x - x0) * z + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    d.line([(0, (y - y0) * z), (c.width, (y - y0) * z)], fill=(255, 0, 255) if y % (step * 5) == 0 else (120, 0, 120))
    if y % (step * 2) == 0:
        d.text((2, (y - y0) * z + 2), str(y), fill=(255, 255, 0))
c.save(sys.argv[2])
