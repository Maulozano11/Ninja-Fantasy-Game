import sys
from PIL import Image, ImageDraw
im = Image.open('../art2/REF-chakra-set-owner.jpg').convert('RGB')
x0, y0, x1, y1, k, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
c = im.crop((x0, y0, x1, y1))
b = c.resize((c.width * k, c.height * k), Image.NEAREST)
d = ImageDraw.Draw(b)
for x in range(x0 - x0 % 5, x1, 5):
    if x < x0: continue
    X = (x - x0) * k
    d.line([(X, 0), (X, b.height)], fill=(200, 0, 0) if x % 10 == 0 else (90, 0, 0))
    if x % 10 == 0: d.text((X + 2, 2), str(x), fill=(255, 255, 0))
for y in range(y0 - y0 % 5, y1, 5):
    if y < y0: continue
    Y = (y - y0) * k
    d.line([(0, Y), (b.width, Y)], fill=(200, 0, 0) if y % 10 == 0 else (90, 0, 0))
    if y % 10 == 0: d.text((2, Y + 2), str(y), fill=(255, 255, 0))
b.save(out)
