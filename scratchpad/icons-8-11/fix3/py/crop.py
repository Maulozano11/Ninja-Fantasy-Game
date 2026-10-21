"""crop.py <out.png> <scale> <img>:<x0>,<y0>,<x1>,<y1> ...: crops shown side by side at the given scale (nearest)."""
import sys
from PIL import Image
out, z = sys.argv[1], int(sys.argv[2])
tiles = []
for a in sys.argv[3:]:
    p, box = a.rsplit(':', 1)
    x0, y0, x1, y1 = map(int, box.split(','))
    im = Image.open(p).convert('RGB').crop((x0, y0, x1, y1))
    tiles.append(im.resize((im.width * z, im.height * z), Image.NEAREST))
W = sum(t.width for t in tiles) + 10 * (len(tiles) + 1)
H = max(t.height for t in tiles) + 20
img = Image.new('RGB', (W, H), (21, 23, 29))
x = 10
for t in tiles:
    img.paste(t, (x, 10))
    x += t.width + 10
img.save(out)
print('wrote', out, img.size)
