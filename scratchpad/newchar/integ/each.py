"""Each frame cropped to its own figure, side by side at k: python3 -I each.py <out.png> <k> <png>..."""
import sys
import numpy as np
from PIL import Image

out, k, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
cells = []
for f in files:
    a = np.asarray(Image.open(f).convert('RGBA'))
    ys, xs = np.nonzero(a[..., 3] > 0)
    c = a[ys.min() - 2:ys.max() + 3, xs.min() - 2:xs.max() + 3]
    o = np.empty(c.shape[:2] + (3,), np.uint8)
    o[:] = (226, 219, 207)
    m = c[..., 3] > 0
    o[m] = c[m, :3]
    cells.append(np.kron(o, np.ones((k, k, 1), np.uint8)))
H = max(c.shape[0] for c in cells)
W = sum(c.shape[1] + 12 for c in cells)
sheet = np.full((H, W, 3), 245, np.uint8)
x = 0
for c in cells:
    sheet[H - c.shape[0]:, x:x + c.shape[1]] = c
    x += c.shape[1] + 12
Image.fromarray(sheet).save(out)
print(sheet.shape)
