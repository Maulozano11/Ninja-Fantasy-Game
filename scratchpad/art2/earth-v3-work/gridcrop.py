import sys
from PIL import Image, ImageDraw
src, out, x0, y0, x1, y1, k = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
step = int(sys.argv[8]) if len(sys.argv) > 8 else 20
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
pad = 40
c = Image.new('RGB', (im.width + pad, im.height + pad), (0, 0, 0))
c.paste(im, (pad, pad))
d = ImageDraw.Draw(c)
for x in range((x0 // step + 1) * step, x1, step):
    X = pad + (x - x0) * k
    d.line([(X, pad - 6), (X, pad)], fill=(255, 255, 0))
    d.text((X - 10, 2 + (14 if (x // step) % 2 else 0)), str(x), fill=(255, 255, 0))
    for Y in range(pad, c.height, 6):
        c.putpixel((X, Y), (90, 90, 0))
for y in range((y0 // step + 1) * step, y1, step):
    Y = pad + (y - y0) * k
    d.line([(pad - 6, Y), (pad, Y)], fill=(255, 255, 0))
    d.text((2, Y - 5), str(y), fill=(255, 255, 0))
    for X in range(pad, c.width, 6):
        c.putpixel((X, Y), (90, 90, 0))
c.save(out)
