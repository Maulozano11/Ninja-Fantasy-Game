# grid crop: python3 -I grid.py src x0 y0 x1 y1 k out [step]
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
step = int(sys.argv[8]) if len(sys.argv) > 8 else 10
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * k, im.height * k), Image.NEAREST)
M = 28
can = Image.new('RGB', (im.width + M, im.height + M), (0, 0, 0))
can.paste(im, (M, M))
d = ImageDraw.Draw(can)
for x in range((x0 // step + 1) * step, x1, step):
    X = M + (x - x0) * k
    d.line([(X, M), (X, M + im.height)], fill=(255, 0, 255) if x % (step * 5) == 0 else (110, 40, 110))
    d.text((X - 8, 2 + (x // step) % 2 * 12), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    Y = M + (y - y0) * k
    d.line([(M, Y), (M + im.width, Y)], fill=(255, 0, 255) if y % (step * 5) == 0 else (110, 40, 110))
    d.text((1, Y - 5), str(y), fill=(255, 255, 0))
can.save(out)
