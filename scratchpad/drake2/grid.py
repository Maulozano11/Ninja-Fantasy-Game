import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * k, im.height * k), Image.NEAREST)
d = ImageDraw.Draw(im)
step = int(sys.argv[8]) if len(sys.argv) > 8 else 20
for gx in range((x0 // step + 1) * step, x1, step):
    X = (gx - x0) * k
    d.line([(X, 0), (X, im.height)], fill=(255, 0, 0) if gx % 100 == 0 else (90, 90, 160), width=1)
    if gx % 100 == 0: d.text((X + 2, 2), str(gx), fill=(255, 255, 0))
for gy in range((y0 // step + 1) * step, y1, step):
    Y = (gy - y0) * k
    d.line([(0, Y), (im.width, Y)], fill=(255, 0, 0) if gy % 100 == 0 else (90, 90, 160), width=1)
    if gy % 100 == 0: d.text((2, Y + 2), str(gy), fill=(255, 255, 0))
im.save(out)
