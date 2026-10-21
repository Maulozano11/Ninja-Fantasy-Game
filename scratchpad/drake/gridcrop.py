import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, step, out = sys.argv[1], *map(int, sys.argv[2:8]), sys.argv[8]
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * k, im.height * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * k
    d.line([(X, 0), (X, im.height)], fill=(0, 255, 255) if x % (step * 5) == 0 else (0, 120, 160), width=1)
    d.text((X + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * k
    d.line([(0, Y), (im.width, Y)], fill=(0, 255, 255) if y % (step * 5) == 0 else (0, 120, 160), width=1)
    d.text((2, Y + 2), str(y), fill=(255, 255, 0))
im.save(out)
