"""crop.py <in.png> <out.png> x0 y0 w h k : nearest-neighbour crop, grey where transparent"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
x0, y0, w, h, k = map(int, sys.argv[3:8])
c = a[y0:y0 + h, x0:x0 + w]
o = np.full(c.shape[:2] + (3,), 200, np.uint8)
m = c[..., 3] > 0
o[m] = c[m, :3]
Image.fromarray(o).resize((w * k, h * k), Image.NEAREST).save(sys.argv[2])
