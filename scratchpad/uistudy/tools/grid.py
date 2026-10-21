import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, k, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
step = int(sys.argv[8]) if len(sys.argv) > 8 else 10
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * k, im.height * k), Image.NEAREST)
pad = 30
can = Image.new('RGB', (im.width + pad, im.height + pad), (20, 20, 20))
can.paste(im, (pad, pad))
d = ImageDraw.Draw(can)
for x in range((x0 // step) * step, x1 + 1, step):
    if x < x0: continue
    X = pad + (x - x0) * k
    d.line([(X, pad), (X, can.height)], fill=(255, 0, 255) if x % 50 == 0 else (0, 255, 255), width=1)
    d.text((X + 1, 2 + (10 if (x // step) % 2 else 0)), str(x), fill=(255, 255, 255))
for y in range((y0 // step) * step, y1 + 1, step):
    if y < y0: continue
    Y = pad + (y - y0) * k
    d.line([(pad, Y), (can.width, Y)], fill=(255, 0, 255) if y % 50 == 0 else (0, 255, 255), width=1)
    d.text((1, Y + 1), str(y), fill=(255, 255, 255))
can.save(out)
