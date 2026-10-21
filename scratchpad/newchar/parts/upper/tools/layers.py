"""layers.py <out.png> <order> [render.png]: the reduced reference's layers (reduced_layers, what is
hidden included) stacked back to front in `order` (comma list), at 10x, with a grid every 5 and,
when given, a render's silhouette in cyan."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image, ImageDraw
import scarlet_ref as R

out = sys.argv[1]
order = sys.argv[2].split(',')
ren = np.asarray(Image.open(sys.argv[3]).convert('RGBA')) if len(sys.argv) > 3 else None
Ls = R.reduced_layers()
idx = np.full((256, 256), 255, np.uint8)
for n in order:
    m = Ls[n] < 255
    idx[m] = Ls[n][m]
x0, y0, x1, y1 = 96, 140, 156, 206
k = 12
a = np.full((256, 256, 3), 236, np.uint8)
yy, xx = np.mgrid[0:256, 0:256]
a[(xx + yy) % 2 == 0] = 226
m = idx < 255
a[m] = R.rgb()[idx[m]]
im = Image.fromarray(a[y0:y1, x0:x1]).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range(x0, x1 + 1, 5):
    d.line(((x - x0) * k, 0, (x - x0) * k, (y1 - y0) * k), fill=(255, 0, 0), width=1)
    d.text(((x - x0) * k + 2, 1), str(x), fill=(255, 0, 0))
for y in range(y0, y1 + 1, 5):
    d.line((0, (y - y0) * k, (x1 - x0) * k, (y - y0) * k), fill=(255, 0, 0), width=1)
    d.text((2, (y - y0) * k + 1), str(y), fill=(255, 0, 0))
if ren is not None:
    al = ren[..., 3] > 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not al[y, x]:
                continue
            X, Y = (x - x0) * k, (y - y0) * k
            for (dx, dy, seg) in ((0, -1, (X, Y, X + k, Y)), (0, 1, (X, Y + k, X + k, Y + k)), (-1, 0, (X, Y, X, Y + k)), (1, 0, (X + k, Y, X + k, Y + k))):
                if not al[y + dy, x + dx]:
                    d.line(seg, fill=(0, 220, 255), width=2)
im.save(out)
