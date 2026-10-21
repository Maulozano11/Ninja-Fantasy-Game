# grid.py <img> x0 y0 x1 y1 scale step out  -- crop with a labelled coordinate grid (full-image coords)
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, step, out = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6]), int(sys.argv[7]), sys.argv[8]
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.width * k), int(im.height * k)), Image.NEAREST)
d = ImageDraw.Draw(im)
for gx in range((x0 // step + 1) * step, x1, step):
    X = (gx - x0) * k
    d.line([(X, 0), (X, im.height)], fill=(255, 60, 60) if gx % (step * 2) == 0 else (120, 40, 40))
    d.text((X + 2, 2), str(gx), fill=(255, 255, 0))
for gy in range((y0 // step + 1) * step, y1, step):
    Y = (gy - y0) * k
    d.line([(0, Y), (im.width, Y)], fill=(255, 60, 60) if gy % (step * 2) == 0 else (120, 40, 40))
    d.text((2, Y + 2), str(gy), fill=(255, 255, 0))
im.save(out)
