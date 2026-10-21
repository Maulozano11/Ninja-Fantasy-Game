"""Side by side: the eye region of his edited window, our 88 and our 44, each enlarged (nearest)."""
import sys
from PIL import Image

d, ident, out = sys.argv[1], sys.argv[2], sys.argv[3]
# region in his window pixels: x0 y0 x1 y1, and his window size
x0, y0, x1, y1, ww, wh = map(int, sys.argv[4:10])
H = 360
parts = []
ed = Image.open('%s/%s-edited-x4.png' % (d, ident))
parts.append(ed.crop((x0 * 4, y0 * 4, x1 * 4, y1 * 4)))
for N in (88, 44):
    im = Image.open('%s/%s-%d.png' % (d, ident, N))
    sx, sy = N / ww, N / wh
    parts.append(im.crop((int(x0 * sx), int(y0 * sy), int(x1 * sx + 0.999), int(y1 * sy + 0.999))))
scaled = []
for p in parts:
    k = H / p.size[1]
    scaled.append(p.resize((round(p.size[0] * k), H), Image.NEAREST))
W = sum(p.size[0] for p in scaled) + 20 * (len(scaled) + 1)
can = Image.new('RGB', (W, H + 40), (16, 16, 20))
x = 20
for p in scaled:
    can.paste(p, (x, 20))
    x += p.size[0] + 20
can.save(out)
