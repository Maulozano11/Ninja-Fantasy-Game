"""silh.py <render.png> <out.png> [parts]: the reduced reference (only `parts`, comma list; default
all) at 10x with the render's silhouette edge drawn over it in cyan."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image, ImageDraw
import scarlet_ref as R

ren = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
out = sys.argv[2]
names = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else None
idx = R.reduced_index()
if names:
    P = R.reduced_parts()
    keep = np.zeros(idx.shape, bool)
    for n in names:
        keep |= P[n]
    idx = np.where(keep, idx, 255)
x0, y0, x1, y1 = 96, 120, 160, 222
k = 10
a = np.full((256, 256, 3), 236, np.uint8)
m = idx < 255
a[m] = R.rgb()[idx[m]]
im = Image.fromarray(a[y0:y1, x0:x1]).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
d = ImageDraw.Draw(im)
al = ren[..., 3] > 0
for y in range(y0, y1):
    for x in range(x0, x1):
        if not al[y, x]:
            continue
        X, Y = (x - x0) * k, (y - y0) * k
        if not al[y - 1, x]:
            d.line((X, Y, X + k, Y), fill=(0, 255, 255), width=2)
        if not al[y + 1, x]:
            d.line((X, Y + k, X + k, Y + k), fill=(0, 255, 255), width=2)
        if not al[y, x - 1]:
            d.line((X, Y, X, Y + k), fill=(0, 255, 255), width=2)
        if not al[y, x + 1]:
            d.line((X + k, Y, X + k, Y + k), fill=(0, 255, 255), width=2)
for x in range(x0, x1, 5):
    d.text(((x - x0) * k + 1, 1), str(x), fill=(255, 0, 0))
for y in range(y0, y1, 5):
    d.text((1, (y - y0) * k + 1), str(y), fill=(255, 0, 0))
im.save(out)
