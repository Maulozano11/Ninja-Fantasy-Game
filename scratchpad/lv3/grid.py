import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
step = int(sys.argv[8]) if len(sys.argv) > 8 else 10
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * k, im.height * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    d.line([((x - x0) * k, 0), ((x - x0) * k, im.height)], fill=(255, 0, 255) if x % 50 == 0 else (120, 0, 120))
    if x % 50 == 0: d.text(((x - x0) * k + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    d.line([(0, (y - y0) * k), (im.width, (y - y0) * k)], fill=(255, 0, 255) if y % 50 == 0 else (120, 0, 120))
    if y % 50 == 0: d.text((2, (y - y0) * k + 2), str(y), fill=(255, 255, 0))
im.save(out)
